"""Subgrafo tipado de una enfermedad para el Pathway Navigator (HACK-023).

Nodos: enfermedad, gen, mecanismo, enfermedades relacionadas, grupos de pacientes y activos. Aristas:
- estructurales (enfermedad–gen, gen–mecanismo, grupo–enfermedad, activo–enfermedad), cada una con la fuente
  curada que la respalda;
- las aristas curadas E01… de la capa profunda, con su tipo, nivel de evidencia y resumen.
Fuera del cluster curado se devuelve el nodo central y una cobertura honesta de lo que falta.
"""

import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEEP = ROOT / "app" / "fixtures" / "deep" / "deep.json"
OVERVIEW = ROOT / "app" / "fixtures" / "graph" / "overview.json"
PHENOTYPE_SOURCE = (
    "https://github.com/obophenotype/human-phenotype-ontology/releases/download/v2026-09-01/phenotype.hpoa"
)
NEIGHBORS = 6  # vecinos fenotípicos (HACK-030); más saturaría el navigator
GENES_SOURCE = (
    "https://github.com/obophenotype/human-phenotype-ontology/releases/download/v2026-09-01/genes_to_disease.txt"
)


@lru_cache(maxsize=1)
def data() -> tuple[dict, dict]:
    deep = json.loads(DEEP.read_text(encoding="utf-8"))
    names = {n["id"]: n["name"] for n in json.loads(OVERVIEW.read_text(encoding="utf-8"))["nodes"]}
    return deep, names


class Graph:
    def __init__(self):
        self.nodes: dict[str, dict] = {}
        self.edges: dict[str, dict] = {}

    def node(self, node_id: str, type_: str, label: str, **meta) -> str:
        self.nodes.setdefault(node_id, {"id": node_id, "type": type_, "label": label, "meta": meta})
        return node_id

    def edge(self, edge_id: str, src: str, dst: str, type_: str, evidence: str, source_url: str | None,
             summary: str, curated_id: str | None = None) -> None:
        self.edges.setdefault(edge_id, {"id": edge_id, "src": src, "dst": dst, "type": type_,
                                        "evidence_level": evidence, "source_url": source_url,
                                        "summary": summary, "curated_edge_id": curated_id})


def build(disease_id: str) -> dict:
    deep, names = data()
    if disease_id not in names:
        raise LookupError(f"{disease_id} is not in the atlas")
    curated = {d["id"]: d for d in deep["diseases"]}
    mechanisms = {m["id"]: m for m in deep["mechanisms"]}
    gene_of = {d: g["symbol"] for g in deep["genes"] for d in g["disease_ids"]}
    g = Graph()
    center = g.node(disease_id, "disease", names[disease_id], center=True, curated=disease_id in curated)

    if disease_id not in curated:
        add_neighbors(g, disease_id, curated, names)
        return {
            "center": center, "nodes": list(g.nodes.values()), "edges": list(g.edges.values()),
            "coverage": {
                "searched": _searched(deep),
                "missing": [
                    (f"No curated gene, mechanism, patient group or study is linked to {names[disease_id]} yet. "
                     "This does not mean none exists."),
                    ("Next question: is there a genetic diagnosis? A confirmed gene would connect this disease "
                     "to its mechanism and to other communities."),
                ],
            },
        }

    def add_disease(did: str) -> str:
        info = curated[did]
        node = g.node(did, "disease", names.get(did, did), curated=True,
                      mechanism=info["mechanism_ids"][0] if info["mechanism_ids"] else None)
        symbol = gene_of.get(did)
        if symbol:
            gene = g.node(f"gene:{symbol}", "gene", symbol)
            g.edge(f"s:{did}->{gene}", did, gene, "caused_by", "observado", GENES_SOURCE,
                   f"{names.get(did, did)} is caused by variants in {symbol} (HPO genes_to_disease).")
            for mid in info["mechanism_ids"]:
                mech = mechanisms[mid]
                m_node = g.node(f"mech:{mid}", "mechanism", mech["name"], family=mid.split(".")[0])
                g.edge(f"s:{gene}->{m_node}", gene, m_node, "participates_in", "observado", mech["source_url"],
                       f"{symbol} takes part in {mech['name']}.")
        return node

    add_disease(disease_id)
    # Enfermedades unidas por aristas curadas y por el mismo mecanismo.
    related = set()
    for e in deep["edges"]:
        if disease_id in (e["src"], e["dst"]):
            related.add(e["dst"] if e["src"] == disease_id else e["src"])
    for mid in curated[disease_id]["mechanism_ids"]:
        related |= {d["id"] for d in deep["diseases"] if mid in d["mechanism_ids"] and d["id"] != disease_id}
    for did in sorted(related):
        add_disease(did)
    included = {n for n, v in g.nodes.items() if v["type"] == "disease"}
    for e in deep["edges"]:
        if e["src"] in included and e["dst"] in included and disease_id in (e["src"], e["dst"]):
            g.edge(e["id"], e["src"], e["dst"], e["type"], e["evidence_level"], e["source_url"], e["summary"], e["id"])

    for group in deep["patient_groups"]:
        for did in group["diseases"]:
            if did in included and (did == disease_id or did in related):
                node = g.node(f"group:{group['name']}", "group", group["name"], url=group["url"])
                g.edge(f"s:{node}->{did}", node, did, "patient_group_for", "observado", group["url"],
                       f"{group['name']} works with families affected by {names.get(did, did)}.")
    for asset in deep["assets"]:
        for did in deep["asset_diseases"].get(asset["id"], []):
            if did == disease_id:
                node = g.node(f"asset:{asset['id']}", "asset", asset["name"], kind=asset["kind"], url=asset["url"])
                g.edge(f"s:{node}->{did}", node, did, f"{asset['kind']}_for", asset["evidence_level"], asset["url"],
                       f"{asset['name']} ({asset['id']}).")

    add_neighbors(g, disease_id, curated, names)
    missing = []
    if not any(n["type"] == "group" for n in g.nodes.values()):
        missing.append("No patient organization curated for this disease yet.")
    if not any(n["type"] == "asset" for n in g.nodes.values()):
        missing.append("No registry, natural history study or trial curated for this disease yet.")
    if not any(e["evidence_level"] == "contradictorio" for e in g.edges.values()):
        missing.append("No contradictory finding is curated for these connections; absence of evidence is not "
                       "evidence of agreement.")
    return {"center": center, "nodes": list(g.nodes.values()), "edges": list(g.edges.values()),
            "coverage": {"searched": _searched(deep), "missing": missing}}


def add_neighbors(g: Graph, disease_id: str, curated: dict, names: dict) -> None:
    """HACK-030: 'who shares our disease characteristics?' Vecinos fenotípicos de HACK-025 como aristas inferidas."""
    from app.services.similar import similar

    try:
        neighbors = similar(disease_id, NEIGHBORS)["neighbors"]
    except LookupError:
        return
    for n in neighbors:
        other = n["disease_id"]
        g.node(other, "disease", names.get(other, n["name"]), curated=other in curated)
        g.nodes[other]["meta"]["similarity"] = round(n["score"], 3)  # también si ya estaba como pariente curado
        top = ", ".join(t["label"] for t in n["shared"][:3]) or "several phenotypes"
        overlap = n.get("curated") or {}
        shared_mech = overlap.get("mechanisms") or []
        extra = f" Also shares the curated mechanism {shared_mech[0]}." if shared_mech else ""
        g.edge(f"sim:{disease_id}->{other}", disease_id, other, "phenotype_similarity", "inferido", PHENOTYPE_SOURCE,
               f"Phenotype similarity {n['score']:.2f} (IC-weighted, HPO annotations); most informative shared "
               f"findings: {top}. Similar symptoms do not prove a shared cause.{extra}")


def _searched(deep: dict) -> list[str]:
    return [
        (f"Curated deep layer: {len(deep['diseases'])} diseases, {len(deep['edges'])} cited edges, "
         f"{len(deep['patient_groups'])} patient organizations, {len(deep['assets'])} registries, studies and "
         f"trials (verified {deep['verified_at'][:10]})"),
        "HPO v2026-09-01 annotations for 12,867 diseases, with IC-weighted phenotype neighbors (HACK-025)",
        f"ClinicalTrials.gov API v2 and NIH RePORTER snapshot ({deep['api_retrieved_at'][:10]})",
    ]
