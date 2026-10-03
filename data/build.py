#!/usr/bin/env python3
"""HPO crudo (data/raw/) → app/fixtures/graph/{overview,annotations}.json.

Uso:
  bash data/fetch.sh && python3 data/build.py    # genera los fixtures
  python3 data/build.py --check                  # valida sin reescribir (y reproducibilidad si hay crudos)

Sólo biblioteca estándar y salida determinista: el mismo crudo produce los mismos bytes.
El layout se calcula aquí, nunca en el navegador.
"""
import argparse
import hashlib
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "app" / "fixtures" / "graph"
OVERVIEW = OUT / "overview.json"
ANNOTATIONS = OUT / "annotations.json"

PHENOTYPIC_ABNORMALITY = "HP:0000118"
REQUIRED_IDS = ("OMIM:621314", "ORPHA:34515")
MIN_DISEASES = 12000
MAX_OVERVIEW_BYTES = 3 * 1024 * 1024

# Términos de frecuencia de HPO → punto medio del intervalo que definen.
FREQUENCY_TERMS = {
    "HP:0040280": 1.0,  # Obligate (100 %)
    "HP:0040281": 0.895,  # Very frequent (80-99 %)
    "HP:0040282": 0.545,  # Frequent (30-79 %)
    "HP:0040283": 0.17,  # Occasional (5-29 %)
    "HP:0040284": 0.025,  # Very rare (1-4 %)
    "HP:0040285": 0.0,  # Excluded (0 %)
}

GOLDEN_ANGLE = math.pi * (3 - math.sqrt(5))
STAR_SPACING = 4.0  # distancia media entre estrellas vecinas, en unidades del layout


def hpo_id(iri: str) -> str:
    return iri.rsplit("/", 1)[-1].replace("_", ":")


def load_ontology(path: Path):
    graph = json.loads(path.read_text(encoding="utf-8"))["graphs"][0]
    labels = {}
    for node in graph["nodes"]:
        if node.get("type") == "CLASS" and "HP_" in node["id"] and not node.get("meta", {}).get("deprecated"):
            labels[hpo_id(node["id"])] = node.get("lbl", "")
    parents = defaultdict(set)
    for edge in graph["edges"]:
        if edge["pred"] == "is_a":
            child, parent = hpo_id(edge["sub"]), hpo_id(edge["obj"])
            if child in labels and parent in labels:
                parents[child].add(parent)
    return labels, parents


def ancestors_under(term: str, parents, top: str, cache: dict) -> frozenset:
    """Ancestros propios de `term` por debajo de `top` (sin incluir `top`)."""
    if term in cache:
        return cache[term]
    result = set()
    for parent in parents.get(term, ()):
        if parent == top:
            continue
        result.add(parent)
        result |= ancestors_under(parent, parents, top, cache)
    cache[term] = frozenset(result)
    return cache[term]


def system_label(label: str) -> str:
    """'Abnormality of the nervous system' → 'Nervous system'."""
    short = label.removeprefix("Abnormality of the ").removeprefix("Abnormality of ")
    return short[:1].upper() + short[1:]


def parse_frequency(raw: str):
    """Frecuencia conocida en [0, 1] o None si la anotación no la declara."""
    raw = raw.strip()
    if not raw:
        return None
    if raw in FREQUENCY_TERMS:
        return FREQUENCY_TERMS[raw]
    if "/" in raw:
        num, den = raw.split("/", 1)
        return int(num) / int(den) if int(den) > 0 else None
    if raw.endswith("%"):
        return float(raw[:-1]) / 100
    return None


def load_annotations(path: Path, phenotypes: set):
    names, freqs = {}, defaultdict(lambda: defaultdict(list))
    header = None
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.startswith("#"):
                continue
            fields = line.rstrip("\n").split("\t")
            if header is None:
                header = {name: i for i, name in enumerate(fields)}
                continue
            if fields[header["aspect"]] != "P" or fields[header["qualifier"]] == "NOT":
                continue
            term = fields[header["hpo_id"]]
            if term not in phenotypes:
                continue
            disease = fields[header["database_id"]]
            names.setdefault(disease, fields[header["disease_name"]])
            freqs[disease][term].append(parse_frequency(fields[header["frequency"]]))
    # Varias fuentes por par enfermedad-término: media de las frecuencias conocidas.
    merged = {}
    for disease in sorted(freqs):
        terms = {}
        for term in sorted(freqs[disease]):
            known = [f for f in freqs[disease][term] if f is not None]
            terms[term] = round(sum(known) / len(known), 4) if known else None
        merged[disease] = terms
    return names, merged


def pack_circles(radii: list) -> list:
    """Centros sin solape para círculos de radio dado (mayor primero), en espiral dorada."""
    centers = []
    for i, radius in enumerate(radii):
        if i == 0:
            centers.append((0.0, 0.0))
            continue
        angle, distance = i * GOLDEN_ANGLE, radii[0] + radius
        while True:
            x, y = distance * math.cos(angle), distance * math.sin(angle)
            if all(math.hypot(x - cx, y - cy) >= radius + radii[j] * 1.0 for j, (cx, cy) in enumerate(centers)):
                centers.append((x, y))
                break
            distance += max(radius * 0.25, STAR_SPACING)
    return centers


def disc_radius(count: int) -> float:
    return STAR_SPACING * math.sqrt(max(count, 1)) * 0.6 + STAR_SPACING


def jitter(key: str) -> tuple:
    digest = hashlib.sha256(key.encode()).digest()
    return (digest[0] / 255 - 0.5) * STAR_SPACING * 0.5, (digest[1] / 255 - 0.5) * STAR_SPACING * 0.5


def layout(groups: dict, subgroups: dict, annotation_counts: dict):
    """Galaxia por sistema HPO; dentro, cúmulos por subsistema; estrellas en girasol."""
    system_order = sorted(groups, key=lambda s: (-len(groups[s]), s))
    galaxies = {}
    for system in system_order:
        clusters = defaultdict(list)
        for disease in groups[system]:
            clusters[subgroups[disease]].append(disease)
        cluster_order = sorted(clusters, key=lambda c: (-len(clusters[c]), c))
        cluster_radii = [disc_radius(len(clusters[c])) for c in cluster_order]
        cluster_centers = pack_circles(cluster_radii)
        extent = max(math.hypot(x, y) + r for (x, y), r in zip(cluster_centers, cluster_radii))
        galaxies[system] = (clusters, cluster_order, cluster_centers, extent * 1.15)

    galaxy_centers = pack_circles([galaxies[s][3] for s in system_order])
    positions, group_meta = {}, []
    for system, (gx, gy) in zip(system_order, galaxy_centers):
        clusters, cluster_order, cluster_centers, extent = galaxies[system]
        for cluster, (cx, cy) in zip(cluster_order, cluster_centers):
            # Las enfermedades con más fenotipos quedan al centro del cúmulo.
            members = sorted(clusters[cluster], key=lambda d: (-annotation_counts[d], d))
            for i, disease in enumerate(members):
                r = STAR_SPACING * 0.6 * math.sqrt(i)
                jx, jy = jitter(disease)
                positions[disease] = (
                    round(gx + cx + r * math.cos(i * GOLDEN_ANGLE) + jx, 1),
                    round(gy + cy + r * math.sin(i * GOLDEN_ANGLE) + jy, 1),
                )
        group_meta.append((system, round(gx, 1), round(gy, 1), round(extent, 1)))
    return positions, group_meta


def build(raw: Path = RAW) -> tuple:
    labels, parents = load_ontology(raw / "hp.json")
    cache, root_cache = {}, {}
    phenotypes = {t for t in labels if PHENOTYPIC_ABNORMALITY in ancestors_under(t, parents, "HP:0000001", root_cache)}
    names, annotations = load_annotations(raw / "phenotype.hpoa", phenotypes)
    systems = {t for t in phenotypes if PHENOTYPIC_ABNORMALITY in parents.get(t, ())}

    def lineage(term: str) -> frozenset:
        return ancestors_under(term, parents, PHENOTYPIC_ABNORMALITY, cache) | {term}

    # Grupo = sistema raíz con más anotaciones; subgrupo = nieto de ese sistema con más anotaciones
    # (el primer nivel casi siempre es sólo "morfología"/"fisiología" y no separa cúmulos).
    groups, subgroups = defaultdict(list), {}
    for disease, terms in annotations.items():
        votes = Counter(s for t in terms for s in lineage(t) & systems)
        system = min(votes, key=lambda s: (-votes[s], s))
        children = {c for t in terms for c in lineage(t) if system in parents.get(c, ())}
        grandchildren = Counter(g for t in terms for g in lineage(t) if parents.get(g, set()) & children)
        level = grandchildren or Counter(c for t in terms for c in lineage(t) if c in children)
        subgroups[disease] = min(level, key=lambda c: (-level[c], c)) if level else system
        groups[system].append(disease)

    counts = {d: len(t) for d, t in annotations.items()}
    positions, group_meta = layout(groups, subgroups, counts)
    group_of = {d: s for s, members in groups.items() for d in members}

    version = (raw / "VERSION").read_text().strip() if (raw / "VERSION").exists() else "unknown"
    overview = {
        "source": {"hpo": version, "diseases": len(annotations)},
        "groups": [
            {"id": s, "label": system_label(labels[s]),
             "count": len(groups[s]), "x": x, "y": y, "r": r}
            for s, x, y, r in group_meta
        ],
        "diseases": [
            {"id": d, "name": names[d], "group": group_of[d], "x": positions[d][0], "y": positions[d][1],
             "n": counts[d]}
            for d in sorted(annotations)
        ],
    }

    # Prevalencia propagada: fracción de enfermedades anotadas con t o con un descendiente de t.
    prevalence = Counter()
    for terms in annotations.values():
        prevalence.update(set().union(*(lineage(t) for t in terms)))
    total = len(annotations)
    annotations_doc = {
        "source": {"hpo": version, "diseases": total},
        "notes": {
            "diseases": "disease_id -> {hpo_id: freq}; freq en [0,1] o null = frecuencia desconocida (no es ausencia)",
            "ancestors": "hpo_id -> ancestros propios bajo HP:0000118; un término observado coincide con "
                         "anotaciones de sus ancestros y descendientes",
            "background": "hpo_id -> fracción de enfermedades anotadas con el término o un descendiente; "
                          "si falta, usar 1/diseases",
        },
        "diseases": annotations,
        "ancestors": {t: sorted(ancestors_under(t, parents, PHENOTYPIC_ABNORMALITY, cache)) for t in sorted(phenotypes)},
        "background": {t: round(prevalence[t] / total, 6) for t in sorted(prevalence)},
    }
    return overview, annotations_doc


def dump(document) -> bytes:
    return json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def check() -> list:
    errors = []
    if not OVERVIEW.exists() or not ANNOTATIONS.exists():
        return [f"faltan fixtures en {OUT.relative_to(ROOT)}: ejecute bash data/fetch.sh && python3 data/build.py"]
    overview_bytes, annotations_bytes = OVERVIEW.read_bytes(), ANNOTATIONS.read_bytes()
    overview, annotations = json.loads(overview_bytes), json.loads(annotations_bytes)
    ids = {d["id"] for d in overview["diseases"]}
    groups = {g["id"] for g in overview["groups"]}
    if len(ids) < MIN_DISEASES:
        errors.append(f"sólo {len(ids)} enfermedades (< {MIN_DISEASES})")
    errors += [f"falta {i}" for i in REQUIRED_IDS if i not in ids]
    if len(overview_bytes) >= MAX_OVERVIEW_BYTES:
        errors.append(f"overview.json pesa {len(overview_bytes)} bytes (>= 3 MB)")
    if any(not (math.isfinite(d["x"]) and math.isfinite(d["y"])) or d["group"] not in groups for d in overview["diseases"]):
        errors.append("hay enfermedades sin posición finita o con grupo desconocido")
    if set(annotations["diseases"]) != ids:
        errors.append("annotations.json y overview.json no cubren las mismas enfermedades")
    if (RAW / "hp.json").exists() and (RAW / "phenotype.hpoa").exists():
        fresh_overview, fresh_annotations = build()
        if dump(fresh_overview) != overview_bytes or dump(fresh_annotations) != annotations_bytes:
            errors.append("los fixtures no coinciden con un build desde data/raw/: regenere con python3 data/build.py")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="valida los fixtures sin reescribirlos")
    args = parser.parse_args()
    if args.check:
        errors = check()
        if errors:
            print("GRAPH_CHECK_FAIL: " + "; ".join(errors))
            return 1
        overview = json.loads(OVERVIEW.read_text(encoding="utf-8"))
        print(f"GRAPH_CHECK_PASS: {len(overview['diseases'])} enfermedades, {len(overview['groups'])} galaxias")
        return 0
    if not (RAW / "hp.json").exists():
        print("Faltan crudos: ejecute bash data/fetch.sh", file=sys.stderr)
        return 1
    overview, annotations = build()
    OUT.mkdir(parents=True, exist_ok=True)
    OVERVIEW.write_bytes(dump(overview))
    ANNOTATIONS.write_bytes(dump(annotations))
    print(f"OK overview.json {OVERVIEW.stat().st_size} bytes · annotations.json {ANNOTATIONS.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
