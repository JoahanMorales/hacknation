#!/usr/bin/env python3
"""Validación retrospectiva del scoring sobre casos publicados de phenopacket-store 0.1.27.

Uso:
  curl -fsSL -o data/raw/all_phenopackets.zip \\
    https://github.com/monarch-initiative/phenopacket-store/releases/download/0.1.27/all_phenopackets.zip
  uv run python data/validate.py            # recalcula app/fixtures/validation/ y docs/validation.md
  python3 data/validate.py --check          # lee el resultado guardado sin recalcular (sólo stdlib)

Validación retrospectiva sobre casos publicados, no prueba clínica. Muestra con semilla fija: mismo zip, mismos bytes.
"""
import argparse
import json
import math
import random
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ZIP = ROOT / "data" / "raw" / "all_phenopackets.zip"
OUT = ROOT / "app" / "fixtures" / "validation" / "validation.json"
DOC = ROOT / "docs" / "validation.md"

RELEASE = "0.1.27"
ZIP_URL = f"https://github.com/monarch-initiative/phenopacket-store/releases/download/{RELEASE}/all_phenopackets.zip"
COHORT = "GAA"
DEMO_CASE = "PMID_7668832_Father"  # caso guiado de la demo (app/fixtures/case/pompe_case.json)
SAMPLE = 200
SEED = 7668832
MIN_TERMS = 3
# Cortes candidatos del pct top-1 para el estado "sin ruta soportada".
CUTS = [1, 5, 10, 20, 30, 50]
# El corte recomendado deja al menos este porcentaje de casos como "con ruta" (los demás piden más síntomas).
COVERAGE = 0.75


def load_cases() -> tuple[list, list, dict]:
    """(casos GAA, resto) como {id, cohort, disease_id, terms}; descarta los que no tienen diagnóstico único."""
    skipped = defaultdict(int)
    gaa, rest = [], []
    with zipfile.ZipFile(ZIP) as archive:
        for name in sorted(archive.namelist()):
            if not name.endswith(".json"):
                continue
            packet = json.loads(archive.read(name))
            diseases = {d["term"]["id"] for d in packet.get("diseases", []) if not d.get("excluded")}
            if len(diseases) != 1:
                skipped["no single diagnosis"] += 1
                continue
            terms = [
                {"hpo_id": f["type"]["id"], "present": not f.get("excluded", False)}
                for f in packet.get("phenotypicFeatures", [])
            ]
            cohort = name.split("/")[1]
            case = {"id": packet["id"], "cohort": cohort, "disease_id": diseases.pop(), "terms": terms}
            (gaa if cohort == COHORT else rest).append(case)
    return gaa, rest, dict(skipped)


def rank(scorer, case: dict) -> dict:
    """Posición del diagnóstico publicado en el ranking puntual del scorer (sin las 64 tiradas de rango)."""
    # El mismo recorte que /api/diagnose: mismos pct que la API.
    from app.services.scoring import clip

    terms = [t for t in case["terms"] if t["hpo_id"] in scorer.ancestors]
    logs = defaultdict(float)
    for term in terms:
        column = scorer.column(term["hpo_id"])
        background = scorer.background(column)
        for disease, (freq, _) in column.items():
            logs[disease] += math.log(scorer.ratio(clip(freq), background, term["present"]))
    pct = scorer._normalized(logs)
    rest = pct.pop("_rest")
    order = sorted(scorer.ids, key=lambda d: (-pct.get(d, rest), d))
    truth = case["disease_id"]
    return {
        "id": case["id"], "cohort": case["cohort"], "disease_id": truth,
        "terms_used": len(terms), "terms_unknown": len(case["terms"]) - len(terms),
        "rank": order.index(truth) + 1,
        "top1_id": order[0], "top1_pct": round(pct.get(order[0], rest), 4),
    }


def summary(rows: list) -> dict:
    n = len(rows)
    return {
        "n": n,
        "top1": round(sum(r["rank"] == 1 for r in rows) / n, 4) if n else None,
        "top3": round(sum(r["rank"] <= 3 for r in rows) / n, 4) if n else None,
        "top10": round(sum(r["rank"] <= 10 for r in rows) / n, 4) if n else None,
    }


def threshold(rows: list) -> dict:
    """Por cada corte: casos debajo/encima y su top-3; recomienda el mayor corte que conserva COVERAGE de casos encima."""
    table = []
    for cut in CUTS:
        below = [r for r in rows if r["top1_pct"] < cut]
        above = [r for r in rows if r["top1_pct"] >= cut]
        table.append({
            "top1_pct_below": cut,
            "below": summary(below), "above": summary(above),
        })
    kept = [t["top1_pct_below"] for t in table if t["above"]["n"] >= COVERAGE * len(rows)]
    few = summary([r for r in rows if r["terms_used"] < MIN_TERMS])
    return {
        "rule": f"unsupported if fewer than {MIN_TERMS} known terms or top-1 pct below the recommended cut",
        "recommended_top1_pct": max(kept) if kept else None,
        "min_terms": MIN_TERMS, "fewer_terms": few, "table": table,
    }


def compute() -> dict:
    sys.path.insert(0, str(ROOT))
    from app.services.scoring import get_scorer

    if not ZIP.is_file():
        sys.exit(f"Falta {ZIP.relative_to(ROOT)}; descárgalo de {ZIP_URL}")
    scorer = get_scorer()
    known = set(scorer.ids)
    gaa, rest, skipped = load_cases()
    scorable = [c for c in rest if c["disease_id"] in known]
    skipped["diagnosis outside the 12,867-disease graph"] = len(rest) - len(scorable)
    sample = random.Random(SEED).sample(scorable, SAMPLE)
    gaa_rows = [rank(scorer, c) for c in gaa]
    sample_rows = [rank(scorer, c) for c in sample]
    return {
        "schema_version": "1.0", "demo_data": False,
        "sources": [{"name": "phenopacket-store", "url": ZIP_URL, "version": RELEASE}],
        "method": "Retrospective validation on published cases, not a clinical trial. Each case's published "
                  "HPO terms (excluded = absent) run through the production scorer; rank of the published diagnosis.",
        "seed": SEED, "cases_in_store": len(gaa) + len(rest) + skipped.get("no single diagnosis", 0),
        "skipped": skipped,
        "cohorts": {"gaa": summary(gaa_rows), "sample": summary(sample_rows), "all": summary(gaa_rows + sample_rows)},
        "unsupported_threshold": threshold(gaa_rows + sample_rows),
        "gaa_cases": gaa_rows,
        "sample_cases": sample_rows,
    }


def pct(value) -> str:
    return "n/a" if value is None else f"{100 * value:.0f}%"


def write_doc(result: dict) -> None:
    c, t = result["cohorts"], result["unsupported_threshold"]
    lines = [
        "# Validación retrospectiva del scoring",
        "",
        "> Validación retrospectiva sobre casos publicados, **no prueba clínica**. Generado por `data/validate.py`.",
        "",
        "## Resultado",
        "",
        "| Cohorte | n | top-1 | top-3 | top-10 |",
        "|---|---|---|---|---|",
        *(f"| {name} | {s['n']} | {pct(s['top1'])} | {pct(s['top3'])} | {pct(s['top10'])} |"
          for name, s in (("GAA (Pompe, todos)", c["gaa"]), (f"Muestra aleatoria (semilla {result['seed']})", c["sample"]),
                          ("Total", c["all"]))),
        "",
        "## Método",
        "",
        f"- Fuente: phenopacket-store {result['sources'][0]['version']} ({result['sources'][0]['url']}), BSD-3.",
        (f"- Casos: la cohorte {COHORT} completa y una muestra de {SAMPLE} del resto con un único diagnóstico "
        "que existe en el grafo de 12,867 enfermedades."),
        ("- Entrada: los términos HPO publicados de cada caso; `excluded` cuenta como ausente. Términos fuera de "
        "`hp.json` v2026-09-01 se ignoran."),
        ("- Salida: posición del diagnóstico publicado en el ranking puntual de `app/services/scoring.py` "
        "(LR por fenotipo, prior uniforme, jerarquía HPO)."),
        "- Descartados: " + "; ".join(f"{k}: {v}" for k, v in result["skipped"].items()) + ".",
        "",
        "## Umbral \"sin ruta soportada\"",
        "",
        (f"Regla: {t['rule']}. Corte recomendado: **{t['recommended_top1_pct']}%** "
        f"(mayor corte que deja al menos {COVERAGE:.0%} de los casos con ruta; debajo, el top-3 cae y conviene "
        "preguntar más síntomas). "
        f"Casos con menos de {MIN_TERMS} términos: n={t['fewer_terms']['n']}, top-3 {pct(t['fewer_terms']['top3'])}."),
        "",
        "| top-1 pct < | n debajo | top-3 debajo | n encima | top-3 encima |",
        "|---|---|---|---|---|",
        *(f"| {r['top1_pct_below']}% | {r['below']['n']} | {pct(r['below']['top3'])} | {r['above']['n']} | "
          f"{pct(r['above']['top3'])} |" for r in t["table"]),
        "",
        "## Límites",
        "",
        ("- Circularidad: `phenotype.hpoa` incorpora anotaciones de publicaciones, y parte de estos casos pudo "
        "alimentarlas; el resultado es optimista frente a pacientes nuevos."),
        "- Los casos publicados suelen ser más completos que una primera consulta; no mide el caso dictado.",
        "- El porcentaje es coincidencia fenotípica normalizada, no probabilidad clínica.",
        *(f"- El corte de pct no basta solo: el caso de demo {r['id']} es top-1 correcto con {r['top1_pct']:.1f}%; "
          "combínalo con el número de términos o el margen sobre el 2.º antes de mostrar \"sin ruta\"."
          for r in result["gaa_cases"] if r["id"] == DEMO_CASE),
        "",
    ]
    DOC.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def check() -> None:
    """Lee el resultado guardado y valida su coherencia, sin recalcular ni importar la app."""
    result = json.loads(OUT.read_text(encoding="utf-8"))
    errors = []
    for name, rows_key in (("gaa", "gaa_cases"), ("sample", "sample_cases")):
        rows, saved = result[rows_key], result["cohorts"][name]
        again = summary(rows)
        if again != saved:
            errors.append(f"{name}: resumen {saved} no coincide con casos {again}")
    if result["cohorts"]["gaa"]["n"] != 10:
        errors.append(f"GAA debe tener 10 casos, tiene {result['cohorts']['gaa']['n']}")
    if result["cohorts"]["sample"]["n"] != SAMPLE:
        errors.append(f"la muestra debe tener {SAMPLE} casos")
    if result["demo_data"]:
        errors.append("demo_data debe ser false: son casos publicados reales")
    doc = DOC.read_text(encoding="utf-8") if DOC.is_file() else ""
    for needed in ("no prueba clínica", pct(result["cohorts"]["all"]["top1"]), pct(result["cohorts"]["all"]["top3"])):
        if needed not in doc:
            errors.append(f"docs/validation.md no menciona {needed!r}")
    if errors:
        sys.exit("VALIDATION_CHECK_FAIL: " + "; ".join(errors))
    c = result["cohorts"]
    print(f"VALIDATION_CHECK_PASS: GAA n={c['gaa']['n']} top1={pct(c['gaa']['top1'])} top3={pct(c['gaa']['top3'])}; "
          f"sample n={c['sample']['n']} top1={pct(c['sample']['top1'])} top3={pct(c['sample']['top3'])}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="valida el resultado guardado sin recalcular")
    if parser.parse_args().check:
        check()
        return
    result = compute()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    write_doc(result)
    check()


if __name__ == "__main__":
    main()
