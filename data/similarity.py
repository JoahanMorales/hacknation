#!/usr/bin/env python3
"""Vecinos fenotípicos de cada enfermedad del atlas, ponderados por informatividad (IC).

Uso:
  python3 data/similarity.py            # genera app/fixtures/similarity/neighbors.json y docs/similarity.md
  python3 data/similarity.py --check    # valida el fixture y recalcula una muestra con semilla (reproducibilidad)

Método:
  - Perfil de una enfermedad = sus fenotipos HPO anotados (frecuencia 0 = excluido, se ignora) + todos sus
    ancestros bajo HP:0000118 (propagación por la jerarquía).
  - IC(t) = −ln(fracción de enfermedades cuyo perfil contiene t).
  - similitud(A, B) = Σ IC(perfil A ∩ perfil B) / Σ IC(perfil A ∪ perfil B)   (Jaccard ponderado por IC, 0–1).
  - Candidatos: enfermedades que comparten al menos un fenotipo con IC ≥ CANDIDATE_IC (≈ < 5% del atlas);
    los términos genéricos no generan candidatos pero sí cuentan en la similitud exacta.

Sólo biblioteca estándar y salida determinista: el mismo annotations.json produce los mismos bytes.
"""
import argparse
import json
import math
import random
import sys
from bisect import insort
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANNOTATIONS = ROOT / "app" / "fixtures" / "graph" / "annotations.json"
DEEP = ROOT / "app" / "fixtures" / "deep" / "deep.json"
OUT = ROOT / "app" / "fixtures" / "similarity" / "neighbors.json"
DOC = ROOT / "docs" / "similarity.md"

K = 10
CANDIDATE_IC = 3.0  # e^-3 ≈ 5% de las enfermedades
MAX_BYTES = 5 * 1024 * 1024
CHECK_SAMPLE = 25
AGREEMENT_SAMPLE = 100
SEED = 7668832
LGMD_R9 = "ORPHA:34515"
POMPE = "OMIM:621314"
# Distroglicanopatía = el nombre cita el alfa-distroglicano (MDDG, "alpha-dystroglycan-related") o un gen de su
# glicosilación (Endo & Manya, revisión de genes MDDG); LGMD R9 (FKRP) se cuenta por su ID.
DG_NAME = "dystroglycan"
DG_GENES = ("FKRP", "FKTN", "POMT1", "POMT2", "POMGNT1", "POMGNT2", "LARGE1", "CRPPA", "ISPD", "B3GALNT2",
            "B4GAT1", "RXYLT1", "TMEM5", "POMK", "GMPPB", "DPM1", "DPM2", "DPM3", "DOLK", "DAG1")


def load() -> tuple[dict, dict]:
    annotations = json.loads(ANNOTATIONS.read_text(encoding="utf-8"))
    return annotations, json.loads(DEEP.read_text(encoding="utf-8"))


def profiles(annotations: dict) -> dict:
    ancestors = annotations["ancestors"]
    result = {}
    for disease, terms in annotations["diseases"].items():
        observed = {t for t, freq in terms.items() if freq != 0 and t in ancestors}
        profile = set(observed)
        for term in observed:
            profile.update(ancestors[term])
        result[disease] = frozenset(profile)
    return result


def information_content(profile_of: dict) -> dict:
    counts = defaultdict(int)
    for profile in profile_of.values():
        for term in profile:
            counts[term] += 1
    total = len(profile_of)
    return {t: -math.log(c / total) for t, c in counts.items()}


class Index:
    def __init__(self, annotations: dict):
        self.profile = profiles(annotations)
        self.ic = information_content(self.profile)
        self.weight = {d: sum(self.ic[t] for t in p) for d, p in self.profile.items()}
        self.generic = {d: sum(self.ic[t] for t in p if self.ic[t] < CANDIDATE_IC) for d, p in self.profile.items()}
        self.by_term = defaultdict(list)
        for disease in sorted(self.profile):
            for term in self.profile[disease]:
                if self.ic[term] >= CANDIDATE_IC:
                    self.by_term[term].append(disease)

    def score(self, a: str, b: str) -> float:
        shared = sum(self.ic[t] for t in self.profile[a] & self.profile[b])
        union = self.weight[a] + self.weight[b] - shared
        return shared / union if union else 0.0

    def neighbors(self, disease: str, k: int = K, exhaustive: bool = False) -> list:
        """Top-k exacto entre las enfermedades que comparten un fenotipo informativo (ramificación y poda)."""
        partial = defaultdict(float)
        for term in self.profile[disease]:
            weight = self.ic[term]
            for other in self.by_term.get(term, ()):
                partial[other] += weight
        partial.pop(disease, None)
        mine, generic = self.weight[disease], self.generic[disease]

        def bound(other: str) -> float:
            # Lo genérico compartido no puede superar lo genérico de ninguno de los dos; S/(W-S) crece con S.
            shared = partial[other] + min(generic, self.generic[other])
            return shared / (mine + self.weight[other] - shared)

        bounds = {d: bound(d) for d in partial}
        best = []  # (−score, id) ordenado: los k mejores hasta ahora
        for other in sorted(bounds, key=lambda d: (-bounds[d], d)):
            if not exhaustive and len(best) == k and bounds[other] < -best[-1][0]:
                break
            row = (-self.score(disease, other), other)
            if len(best) < k or row < best[-1]:
                insort(best, row)
                del best[k:]
        return [[other, round(-value, 4)] for value, other in best if value < 0]


def build(annotations: dict) -> dict:
    index = Index(annotations)
    return {
        "schema_version": "1.0",
        "demo_data": False,
        "source": annotations["source"],
        "method": "IC-weighted Jaccard over HPO profiles propagated to ancestors; IC = -ln(fraction of diseases)",
        "k": K,
        "candidate_ic": CANDIDATE_IC,
        "neighbors": {d: index.neighbors(d) for d in sorted(index.profile)},
    }


def is_dg(name: str, disease: str) -> bool:
    words = set(name.replace("-", " ").replace(",", " ").split())
    return DG_NAME in name.lower() or bool(words & set(DG_GENES)) or disease == LGMD_R9


def specific_shared(index: Index, annotations: dict, a: str, b: str) -> list:
    """Fenotipos compartidos más informativos, sin los ancestros de otro compartido (igual que la API)."""
    shared = index.profile[a] & index.profile[b]
    implied = set().union(*(annotations["ancestors"].get(t, ()) for t in shared))
    top = sorted(shared - implied, key=lambda t: (-index.ic[t], t))[:6]
    return [(round(index.ic[t], 2), annotations["labels"][t]) for t in top]


def evidence(result: dict, annotations: dict, deep: dict) -> dict:
    """Números para docs: distroglicanopatías en el top-10 de LGMD R9 frente al azar, y Pompe como contraejemplo."""
    names = {d["id"]: d["name"] for d in json.loads((ROOT / "app/fixtures/graph/overview.json").read_text(encoding="utf-8"))["nodes"]}
    total = len(result["neighbors"])
    dg_all = [d for d in result["neighbors"] if is_dg(names.get(d, ""), d)]
    top = result["neighbors"][LGMD_R9]
    hits = [d for d, _ in top if is_dg(names.get(d, ""), d)]
    expected = len(top) * (len(dg_all) - 1) / (total - 1)
    # Probabilidad hipergeométrica de ver ≥ hits por azar.
    n, good, draws = total - 1, len(dg_all) - 1, len(top)
    p = sum(math.comb(good, i) * math.comb(n - good, draws - i) for i in range(len(hits), draws + 1)) / math.comb(n, draws)
    index = Index(annotations)
    sample = random.Random(SEED).sample(sorted(index.profile), AGREEMENT_SAMPLE)
    agree = sum(index.neighbors(d) == index.neighbors(d, exhaustive=True) for d in sample)
    ranked = sorted((d for d in index.profile if d != LGMD_R9), key=lambda d: (-index.score(LGMD_R9, d), d))
    mech = {d["id"]: d.get("mechanism_ids", []) for d in deep["diseases"]}
    return {
        "agree": agree,
        "dg_total": len(dg_all), "top": [[d, s, names.get(d, d)] for d, s in top], "hits": len(hits),
        "expected": expected, "p_value": p,
        "pompe_rank": ranked.index(POMPE) + 1, "pompe_score": round(index.score(LGMD_R9, POMPE), 4),
        "pompe_mech": mech.get(POMPE), "r9_mech": mech.get(LGMD_R9),
        "pompe_shared": specific_shared(index, annotations, LGMD_R9, POMPE),
    }


def write_doc(result: dict, ev: dict) -> None:
    lines = [
        "# Clusters por fenotipo",
        "",
        "> Generado por `data/similarity.py`. Similitud fenotípica, no diagnóstico ni parentesco causal.",
        "",
        "## Método",
        "",
        "- Perfil = fenotipos HPO anotados en `phenotype.hpoa` (frecuencia 0 se ignora) + sus ancestros.",
        "- IC(t) = −ln(fracción de enfermedades cuyo perfil contiene t): un fenotipo raro pesa más que uno común.",
        "- Similitud = Σ IC compartido / Σ IC de la unión (Jaccard ponderado, 0–1).",
        (f"- Top-{result['k']} por enfermedad para las {len(result['neighbors']):,} del atlas; candidatos = comparten "
         f"un fenotipo con IC ≥ {result['candidate_ic']} (< 5% del atlas). La poda usa una cota superior exacta: "
         f"{ev['agree']}/{AGREEMENT_SAMPLE} enfermedades al azar dan el mismo top-{result['k']} que la búsqueda "
         "exhaustiva. `--check` recalcula una muestra con semilla."),
        ("- Distroglicanopatía (para la evidencia) = el nombre menciona el alfa-distroglicano o un gen de su "
         f"glicosilación ({', '.join(DG_GENES)})."),
        "",
        "## Evidencia: LGMD R9 (FKRP, ORPHA:34515)",
        "",
        (f"**{ev['hits']} de {len(ev['top'])}** vecinos son distroglicanopatías, frente a **{ev['expected']:.2f}** "
         f"esperadas por azar ({ev['dg_total']} distroglicanopatías en {len(result['neighbors']):,} enfermedades; "
         f"p hipergeométrica = {ev['p_value']:.1e})."),
        "",
        "| # | Vecino | Similitud | ¿Distroglicanopatía? |",
        "|---|---|---|---|",
        *(f"| {i} | {name} (`{d}`) | {s:.3f} | {'sí' if is_dg(name, d) else 'no'} |"
          for i, (d, s, name) in enumerate(ev["top"], 1)),
        "",
        "## Contraejemplo: Pompe tardío (OMIM:621314)",
        "",
        (f"Fenotipo parecido, mecanismo distinto: Pompe queda en el puesto **{ev['pompe_rank']}** para LGMD R9 "
         f"(similitud {ev['pompe_score']:.3f}) porque comparte debilidad proximal y CK alta, pero su mecanismo curado es "
         f"`{', '.join(ev['pompe_mech'] or ['?'])}` frente a `{', '.join(ev['r9_mech'] or ['?'])}`. "
         "Por eso la similitud fenotípica sirve para el diferencial y la colaboración, no para transferir tratamientos."),
        "",
        "Fenotipos compartidos más informativos: " + "; ".join(f"{label} (IC {ic})" for ic, label in ev["pompe_shared"]) + ".",
        "",
        "## Límites",
        "",
        "- Las anotaciones son de la literatura y desiguales: enfermedades poco descritas tienen vecinos menos fiables.",
        "- Frecuencias no se usan en la similitud (sólo presencia); la ausencia no anotada no es ausencia real.",
        "",
    ]
    DOC.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def check() -> None:
    errors = []
    size = OUT.stat().st_size
    if size > MAX_BYTES:
        errors.append(f"fixture {size} bytes > {MAX_BYTES}")
    result = json.loads(OUT.read_text(encoding="utf-8"))
    annotations, _ = load()
    if set(result["neighbors"]) != set(annotations["diseases"]):
        errors.append("el fixture no cubre exactamente las enfermedades de annotations.json")
    for disease, rows in result["neighbors"].items():
        if len(rows) > result["k"] or any(not 0 < s <= 1 for _, s in rows) or [s for _, s in rows] != sorted(
                (s for _, s in rows), reverse=True):
            errors.append(f"{disease}: vecinos fuera de forma")
            break
    index = Index(annotations)
    sample = sorted({LGMD_R9, POMPE, *random.Random(SEED).sample(sorted(index.profile), CHECK_SAMPLE)})
    drift = [d for d in sample if index.neighbors(d) != result["neighbors"][d]]
    if drift:
        errors.append(f"no reproducible para {drift[:3]}")
    if "LGMD R9" not in (DOC.read_text(encoding="utf-8") if DOC.is_file() else ""):
        errors.append("falta docs/similarity.md con la evidencia de LGMD R9")
    if errors:
        sys.exit("SIMILARITY_CHECK_FAIL: " + "; ".join(errors))
    covered = sum(bool(rows) for rows in result["neighbors"].values())
    print(f"SIMILARITY_CHECK_PASS: {len(result['neighbors'])} enfermedades, {covered} con vecinos, "
          f"{size / 1e6:.2f} MB, muestra de {len(sample)} reproducible")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="valida el fixture y recalcula una muestra")
    if parser.parse_args().check:
        check()
        return
    annotations, deep = load()
    result = build(annotations)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    write_doc(result, evidence(result, annotations, deep))
    check()


if __name__ == "__main__":
    main()
