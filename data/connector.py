#!/usr/bin/env python3
"""Connector (módulo 3.3): investigadores, financiamiento y literatura del cluster distroglicano + Pompe.

Uso:
  python3 data/connector.py --fetch      # red: NIH RePORTER v2 + PubMed E-utilities → data/raw/connector/ (ignorado)
  uv run python data/connector.py --extract   # OpenAI: aristas candidatas desde los resúmenes cacheados (requiere clave)
  python3 data/connector.py              # crudo cacheado → app/fixtures/connector/snapshot.json (sin red)
  python3 data/connector.py --check      # valida el snapshot sin red

El snapshot sólo guarda datos públicos: proyectos NIH (título, organización, PIs con su profile_id público y URL)
y metadatos PubMed (PMID, título, año). Los resúmenes completos quedan en data/raw/ y no se publican; de cada
arista extraída se guarda una cita breve que debe aparecer literal en su resumen.
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "connector"
DEEP = ROOT / "app" / "fixtures" / "deep" / "deep.json"
OUT = ROOT / "app" / "fixtures" / "connector" / "snapshot.json"

REPORTER = "https://api.reporter.nih.gov/v2/projects/search"
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
FISCAL_YEARS = [2022, 2023, 2024, 2025, 2026]
PROJECTS_PER_GENE = 50
ABSTRACTS_PER_GENE = 20
TIMEOUT = 30
UA = "hacknation-connector/1.0 (hackathon prototype)"
# Búsqueda por gen: GAA es ambiguo (repeticiones GAA), así que se ancla a Pompe.
GENES = {
    "FKRP": ("FKRP", '"FKRP"[tiab]'),
    "FKTN": ('"fukutin" OR "FKTN"', '("FKTN"[tiab] OR "fukutin"[tiab])'),
    "CRPPA": ('"CRPPA" OR ("ISPD" AND "dystroglycan")', '("CRPPA"[tiab] OR ("ISPD"[tiab] AND dystroglycan*[tiab]))'),
    "POMT1": ("POMT1", '"POMT1"[tiab]'),
    "POMGNT1": ("POMGNT1", '"POMGNT1"[tiab]'),
    "LARGE1": ('"LARGE1" OR ("LARGE" AND "dystroglycan")', '("LARGE1"[tiab] OR ("LARGE"[tiab] AND dystroglycan*[tiab]))'),
    "GAA": ('"Pompe disease"', '("Pompe disease"[tiab] AND "GAA"[tiab])'),
}
AI_NOTE = "AI-extracted, unreviewed"


def get_json(url: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return json.load(response)


def get_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read().decode("utf-8")


def fetch() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for gene, (reporter_query, pubmed_query) in GENES.items():
        projects = get_json(REPORTER, {
            "criteria": {
                "advanced_text_search": {"operator": "advanced", "search_field": "projecttitle,terms,abstracttext",
                                         "search_text": reporter_query},
                "fiscal_years": FISCAL_YEARS,
            },
            "include_fields": ["ApplId", "ProjectNum", "ProjectTitle", "FiscalYear", "Organization",
                               "PrincipalInvestigators", "AwardAmount"],
            "limit": PROJECTS_PER_GENE,
        })
        time.sleep(1)  # RePORTER pide ≤ 1 petición por segundo
        ids = get_json(f"{EUTILS}/esearch.fcgi?" + urllib.parse.urlencode(
            {"db": "pubmed", "term": pubmed_query, "retmax": ABSTRACTS_PER_GENE, "sort": "relevance", "retmode": "json"}
        ))["esearchresult"]["idlist"]
        time.sleep(0.4)  # NCBI sin clave: ≤ 3 por segundo
        xml = get_text(f"{EUTILS}/efetch.fcgi?" + urllib.parse.urlencode(
            {"db": "pubmed", "id": ",".join(ids), "rettype": "abstract", "retmode": "xml"}
        )) if ids else "<PubmedArticleSet/>"
        time.sleep(0.4)
        raw = {"gene": gene, "reporter_query": reporter_query, "pubmed_query": pubmed_query,
               "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
               "projects": projects["results"], "reporter_total": projects["meta"]["total"],
               "articles": parse_articles(xml)}
        (RAW / f"{gene}.json").write_text(json.dumps(raw, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
        print(f"FETCH {gene}: {len(raw['projects'])}/{raw['reporter_total']} proyectos, {len(raw['articles'])} artículos")


def parse_articles(xml: str) -> list:
    articles = []
    for node in ET.fromstring(xml).iter("PubmedArticle"):
        pmid = node.findtext(".//PMID")
        abstract = " ".join("".join(part.itertext()).strip() for part in node.iter("AbstractText"))
        year = node.findtext(".//PubDate/Year") or (node.findtext(".//PubDate/MedlineDate") or "")[:4]
        articles.append({"pmid": pmid, "title": "".join(node.find(".//ArticleTitle").itertext()).strip(),
                         "year": int(year) if year.isdigit() else None, "abstract": abstract})
    return articles


def gene_diseases() -> dict:
    deep = json.loads(DEEP.read_text(encoding="utf-8"))
    return {g["symbol"]: g["disease_ids"] for g in deep["genes"] if g["symbol"] in GENES}


def project_row(project: dict) -> dict:
    org = project.get("organization") or {}
    return {
        "appl_id": project["appl_id"],
        "project_num": project["project_num"],
        "title": project["project_title"],
        "fiscal_year": project["fiscal_year"],
        "organization": org.get("org_name"),
        "country": org.get("org_country"),
        "url": f"https://reporter.nih.gov/project-details/{project['appl_id']}",
        "investigators": [
            {"profile_id": pi["profile_id"], "name": pi["full_name"].strip()}
            for pi in project.get("principal_investigators") or [] if pi.get("profile_id")
        ],
    }


def load_raw() -> dict:
    missing = [g for g in GENES if not (RAW / f"{g}.json").is_file()]
    if missing:
        sys.exit(f"Falta crudo para {missing}; ejecuta python3 data/connector.py --fetch")
    return {g: json.loads((RAW / f"{g}.json").read_text(encoding="utf-8")) for g in GENES}


def build() -> dict:
    raw = load_raw()
    diseases = gene_diseases()
    projects: dict[int, dict] = {}
    project_genes = defaultdict(set)
    for gene, data in raw.items():
        for project in data["projects"]:
            projects.setdefault(project["appl_id"], project_row(project))
            project_genes[project["appl_id"]].add(gene)
    # Un investigador "compartido" tiene proyectos financiados que tocan ≥ 2 genes del cluster.
    by_investigator = defaultdict(lambda: {"genes": set(), "projects": set(), "name": ""})
    for appl_id, row in projects.items():
        for pi in row["investigators"]:
            entry = by_investigator[pi["profile_id"]]
            entry["name"] = pi["name"]
            entry["genes"] |= project_genes[appl_id]
            entry["projects"].add(appl_id)
    shared = [
        {"profile_id": pid, "name": e["name"], "genes": sorted(e["genes"]),
         "disease_ids": sorted({d for g in e["genes"] for d in diseases.get(g, [])}),
         "projects": sorted(e["projects"])}
        for pid, e in sorted(by_investigator.items()) if len(e["genes"]) >= 2
    ]
    extracted = json.loads((RAW / "extracted.json").read_text(encoding="utf-8")) if (RAW / "extracted.json").is_file() else None
    return {
        "schema_version": "1.0",
        "demo_data": False,
        "sources": [
            {"name": "NIH RePORTER API v2", "url": "https://api.reporter.nih.gov/", "version": "v2"},
            {"name": "PubMed E-utilities", "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/", "version": "esearch+efetch"},
        ],
        "retrieved_at": max(d["retrieved_at"] for d in raw.values()),
        "fiscal_years": FISCAL_YEARS,
        "genes": {
            gene: {
                "disease_ids": diseases.get(gene, []),
                "reporter_query": data["reporter_query"], "reporter_total": data["reporter_total"],
                "pubmed_query": data["pubmed_query"],
                "projects": sorted(a for a, gs in project_genes.items() if gene in gs),
                "articles": [{"pmid": a["pmid"], "title": a["title"], "year": a["year"],
                              "url": f"https://pubmed.ncbi.nlm.nih.gov/{a['pmid']}/"} for a in data["articles"]],
            }
            for gene, data in raw.items()
        },
        "projects": {str(a): row for a, row in sorted(projects.items())},
        "shared_investigators": shared,
        "extraction": extracted or {"status": "not_run", "model": None, "edges": [],
                                    "note": "Run --extract with OPENAI_API_KEY to add AI-extracted edges."},
    }


def check() -> None:
    errors = []
    snapshot = json.loads(OUT.read_text(encoding="utf-8"))
    if set(snapshot["genes"]) != set(GENES):
        errors.append(f"genes {sorted(snapshot['genes'])} != {sorted(GENES)}")
    for gene, data in snapshot["genes"].items():
        for appl_id in data["projects"]:
            if str(appl_id) not in snapshot["projects"]:
                errors.append(f"{gene}: proyecto {appl_id} sin detalle")
    for project in snapshot["projects"].values():
        if not project["url"].startswith("https://reporter.nih.gov/project-details/"):
            errors.append(f"URL no pública: {project['url']}")
        if any(set(pi) != {"profile_id", "name"} for pi in project["investigators"]):
            errors.append(f"{project['appl_id']}: campos de investigador fuera de nombre/profile_id")
    for edge in snapshot["extraction"]["edges"]:
        if edge.get("evidence_level") != "inferido" or edge.get("note") != AI_NOTE or not edge.get("quote"):
            errors.append(f"arista {edge.get('id')} sin nivel inferido, nota o cita")
    if "abstract" in json.dumps(snapshot["genes"]):
        errors.append("el snapshot no debe publicar resúmenes completos")
    if errors:
        sys.exit("CONNECTOR_CHECK_FAIL: " + "; ".join(errors[:5]))
    print(f"CONNECTOR_CHECK_PASS: {len(snapshot['projects'])} proyectos, "
          f"{sum(len(g['articles']) for g in snapshot['genes'].values())} artículos, "
          f"{len(snapshot['shared_investigators'])} investigadores compartidos, "
          f"{len(snapshot['extraction']['edges'])} aristas extraídas ({snapshot['extraction']['status']})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--fetch", action="store_true", help="descarga RePORTER y PubMed a data/raw/connector/")
    group.add_argument("--check", action="store_true", help="valida el snapshot sin red")
    args = parser.parse_args()
    if args.fetch:
        fetch()
        return
    if args.check:
        check()
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(build(), ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    check()


if __name__ == "__main__":
    main()
