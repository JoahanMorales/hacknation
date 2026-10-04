"""Connector por enfermedad desde el snapshot reproducible (data/connector.py); nunca llama a la red.

Une, para una enfermedad del cluster: proyectos NIH de sus genes con PIs y organizaciones, investigadores que
también financian trabajo en otra enfermedad del cluster, artículos PubMed y aristas extraídas por IA (inferido).
"""

import json
from functools import lru_cache
from pathlib import Path

SNAPSHOT = Path(__file__).resolve().parent.parent / "fixtures" / "connector" / "snapshot.json"
DISCLAIMER = ("Public NIH RePORTER and PubMed records. A shared investigator or AI-extracted edge is a lead to "
              "contact or verify, not evidence of a shared cause or treatment.")


class NotInCluster(LookupError):
    pass


@lru_cache(maxsize=1)
def snapshot() -> dict:
    return json.loads(SNAPSHOT.read_text(encoding="utf-8"))


def connector(disease_id: str) -> dict:
    data = snapshot()
    genes = sorted(g for g, info in data["genes"].items() if disease_id in info["disease_ids"])
    if not genes:
        covered = sorted({d for info in data["genes"].values() for d in info["disease_ids"]})
        raise NotInCluster(f"{disease_id} is not in the connector cluster; covered: {', '.join(covered)}")
    appl_ids = sorted({a for g in genes for a in data["genes"][g]["projects"]})
    projects = sorted((data["projects"][str(a)] for a in appl_ids), key=lambda p: (-p["fiscal_year"], p["appl_id"]))
    organizations = sorted({p["organization"] for p in projects if p["organization"]})
    # Sólo cuenta como puente un investigador que también financia trabajo en OTRO gen del cluster; la enfermedad
    # alélica del mismo gen (FKRP → OMIM:613153) no es otra comunidad.
    shared = []
    for s in data["shared_investigators"]:
        other_genes = sorted(set(s["genes"]) - set(genes))
        if disease_id in s["disease_ids"] and other_genes:
            shared.append({
                "profile_id": s["profile_id"], "name": s["name"], "genes": s["genes"], "other_genes": other_genes,
                "other_disease_ids": sorted({d for g in other_genes for d in data["genes"][g]["disease_ids"]}),
                "projects": s["projects"],
            })
    gene_edges = [e for e in data["extraction"]["edges"] if e.get("gene") in genes]
    edges = [e for e in gene_edges if e.get("about_gene", True)]
    return {
        "schema_version": "1.0",
        "demo_data": data["demo_data"],
        "sources": data["sources"],
        "retrieved_at": data["retrieved_at"],
        "disease_id": disease_id,
        "genes": genes,
        "projects": projects,
        "organizations": organizations,
        "shared_investigators": shared,
        "articles": [a for g in genes for a in data["genes"][g]["articles"]],
        "extracted_edges": edges,
        "context_edges_omitted": len(gene_edges) - len(edges),
        "extraction_status": data["extraction"]["status"],
        "searched": [f"{g}: RePORTER {data['genes'][g]['reporter_query']!s} (FY {data['fiscal_years'][0]}-"
                     f"{data['fiscal_years'][-1]}); PubMed {data['genes'][g]['pubmed_query']}" for g in genes],
        "disclaimer": DISCLAIMER,
    }
