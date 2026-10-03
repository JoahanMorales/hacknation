#!/usr/bin/env python3
"""Capa profunda: data/curate/curated.json (+ APIs públicas) → app/fixtures/deep/deep.json.

Uso:
  python3 data/curate/build.py --refresh   # consulta ClinicalTrials.gov API v2 y NIH RePORTER (sin clave)
  python3 data/curate/build.py             # sin red: usa data/curate/api_snapshot.json
  python3 data/curate/check.py             # valida

Todo dato lleva fuente: lo curado a mano cita su URL en curated.json; títulos y estados de
estudios salen de ClinicalTrials.gov; proyectos financiados, de NIH RePORTER.
"""
import argparse
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CURATED = ROOT / "data" / "curate" / "curated.json"
SNAPSHOT = ROOT / "data" / "curate" / "api_snapshot.json"
OVERVIEW = ROOT / "app" / "fixtures" / "graph" / "overview.json"
OUT = ROOT / "app" / "fixtures" / "deep" / "deep.json"

CT_API = "https://clinicaltrials.gov/api/v2/studies/{}?fields=NCTId,BriefTitle,OverallStatus,StudyType,LastUpdatePostDate"
CT_STUDY = "https://clinicaltrials.gov/study/{}"
REPORTER_API = "https://api.reporter.nih.gov/v2/projects/search"
REPORTER_PROJECT = "https://reporter.nih.gov/project-details/{}"


def http_json(url: str, body: dict = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", "User-Agent": "hacknation"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def refresh(curated: dict) -> dict:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    studies = {}
    for asset in curated["assets"]:
        if asset["id"].startswith("NCT"):
            protocol = http_json(CT_API.format(asset["id"]))["protocolSection"]
            studies[asset["id"]] = {
                "title": protocol["identificationModule"]["briefTitle"],
                "status": protocol["statusModule"]["overallStatus"],
                "study_type": protocol["designModule"]["studyType"],
                "last_update": protocol["statusModule"].get("lastUpdatePostDateStruct", {}).get("date"),
            }
    research = []
    for query in curated["research_queries"]:
        body = {
            "criteria": {"advanced_text_search": {"operator": "and", "search_field": "projecttitle",
                                                  "search_text": query["text"]}},
            "include_fields": ["ApplId", "ProjectNum", "ProjectTitle", "FiscalYear", "Organization"],
            "limit": 3, "sort_field": "fiscal_year", "sort_order": "desc",
        }
        for project in http_json(REPORTER_API, body)["results"]:
            research.append({
                "appl_id": project["appl_id"], "project_num": project["project_num"],
                "title": project["project_title"], "fiscal_year": project["fiscal_year"],
                "organization": project["organization"]["org_name"],
                "url": REPORTER_PROJECT.format(project["appl_id"]), "diseases": query["diseases"],
            })
    return {"retrieved_at": now, "clinicaltrials": studies, "reporter": research}


def build(curated: dict, snapshot: dict) -> dict:
    nodes = {n["id"]: n for n in json.loads(OVERVIEW.read_text(encoding="utf-8"))["nodes"]}
    verified_at = curated["verified_at"]
    gene_of = {d["id"]: d["gene"] for d in curated["diseases"]}

    diseases = [
        {"id": d["id"], "name": nodes[d["id"]]["name"], "synonyms": d["synonyms"], "group": nodes[d["id"]]["group"],
         "mechanism_ids": [d["mechanism"]], "x": nodes[d["id"]]["x"], "y": nodes[d["id"]]["y"]}
        for d in curated["diseases"]
    ]
    pathway_of = {g: m["id"] for m in curated["mechanisms"] for g in m["gene_symbols"]}
    genes = [
        {"symbol": symbol, "disease_ids": [d for d, g in gene_of.items() if g == symbol], "pathway": pathway_of[symbol]}
        for symbol in curated["genes"]
    ]
    edges = [{**{k: v for k, v in e.items()}, "retrieved_at": verified_at} for e in curated["edges"]]

    assets, asset_diseases = [], {}
    for asset in curated["assets"]:
        study = snapshot["clinicaltrials"].get(asset["id"])
        assets.append({
            "kind": asset["kind"], "id": asset["id"],
            "name": asset.get("name") or study["title"],
            "url": asset.get("url") or CT_STUDY.format(asset["id"]),
            "evidence_level": asset["evidence_level"],
        })
        asset_diseases[asset["id"]] = asset["diseases"]
    asset_status = {k: {"status": v["status"], "last_update": v["last_update"]} for k, v in snapshot["clinicaltrials"].items()}

    return {
        "schema_version": "1.0",
        "demo_data": False,
        "verified_at": verified_at,
        "api_retrieved_at": snapshot["retrieved_at"],
        "diseases": diseases,
        "genes": genes,
        "mechanisms": curated["mechanisms"],
        "edges": edges,
        "patient_groups": curated["patient_groups"],
        "assets": assets,
        "asset_diseases": asset_diseases,
        "asset_status": asset_status,
        "asset_notes": {a["id"]: a["note"] for a in curated["assets"] if "note" in a},
        "research": snapshot["reporter"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--refresh", action="store_true", help="consulta ClinicalTrials.gov y NIH RePORTER")
    args = parser.parse_args()
    curated = json.loads(CURATED.read_text(encoding="utf-8"))
    if args.refresh:
        SNAPSHOT.write_text(json.dumps(refresh(curated), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if not SNAPSHOT.exists():
        print("Falta api_snapshot.json: ejecute python3 data/curate/build.py --refresh", file=sys.stderr)
        return 1
    deep = build(curated, json.loads(SNAPSHOT.read_text(encoding="utf-8")))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(deep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"OK deep.json: {len(deep['diseases'])} enfermedades, {len(deep['edges'])} aristas, "
          f"{len(deep['patient_groups'])} grupos, {len(deep['assets'])} activos, {len(deep['research'])} proyectos NIH")
    return 0


if __name__ == "__main__":
    sys.exit(main())
