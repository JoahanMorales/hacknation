#!/usr/bin/env python3
"""Valida app/fixtures/deep/deep.json sin red: nada sin fuente.

Uso: python3 data/curate/check.py   (con `uv run` además valida contra app/schemas de HACK-002)
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEEP = ROOT / "app" / "fixtures" / "deep" / "deep.json"
OVERVIEW = ROOT / "app" / "fixtures" / "graph" / "overview.json"

EVIDENCE = {"observado", "inferido", "hipotesis", "contradictorio"}
REQUIRED_GENES = {"GAA", "FKRP", "FKTN", "CRPPA", "POMT1", "POMGNT1", "LARGE1", "CAPN3", "DYSF", "ANO5"}
REQUIRED_GROUPS = {"International Pompe Association", "CureLGMD2i", "LGMD Awareness Foundation"}
REQUIRED_ASSETS = {"NCT04001595", "NCT04202627", "NCT00231400", "BBP-418-NDA"}


def is_url(value) -> bool:
    return isinstance(value, str) and value.startswith("https://")


def check(deep: dict) -> list:
    errors = []
    graph_ids = {n["id"] for n in json.loads(OVERVIEW.read_text(encoding="utf-8"))["nodes"]}
    disease_ids = {d["id"] for d in deep["diseases"]}
    errors += [f"enfermedad {d} no está en el grafo" for d in sorted(disease_ids - graph_ids)]

    genes = {g["symbol"]: g for g in deep["genes"]}
    errors += [f"falta gen {g}" for g in sorted(REQUIRED_GENES - set(genes))]
    errors += [f"gen {s} sin enfermedad" for s, g in genes.items() if not g["disease_ids"]]
    mechanisms = {m["id"] for m in deep["mechanisms"]}
    errors += [f"mecanismo {m['id']} sin source_url" for m in deep["mechanisms"] if not is_url(m.get("source_url"))]
    errors += [f"{d['id']} sin mecanismo conocido" for d in deep["diseases"]
               if not d["mechanism_ids"] or set(d["mechanism_ids"]) - mechanisms]

    for edge in deep["edges"]:
        where = f"arista {edge.get('id')}"
        if not is_url(edge.get("source_url")):
            errors.append(f"{where} sin source_url")
        if edge.get("evidence_level") not in EVIDENCE:
            errors.append(f"{where} con evidence_level inválido: {edge.get('evidence_level')}")
        if not edge.get("record_id") or not edge.get("retrieved_at"):
            errors.append(f"{where} sin record_id o retrieved_at")
        if {edge.get("src"), edge.get("dst")} - disease_ids:
            errors.append(f"{where} apunta a una enfermedad fuera de la capa profunda")
    types = {e["type"] for e in deep["edges"]}
    errors += [f"falta arista de tipo {t}" for t in ("shared_pathway", "therapy_bridge", "allelic_series") if t not in types]

    groups = {g["name"]: g for g in deep["patient_groups"]}
    errors += [f"falta grupo {g}" for g in sorted(REQUIRED_GROUPS - set(groups))]
    errors += [f"grupo {n} sin url" for n, g in groups.items() if not is_url(g["url"])]

    assets = {a["id"]: a for a in deep["assets"]}
    errors += [f"falta activo {a}" for a in sorted(REQUIRED_ASSETS - set(assets))]
    for asset_id, asset in assets.items():
        if not is_url(asset["url"]) or asset["evidence_level"] not in EVIDENCE:
            errors.append(f"activo {asset_id} sin url o con evidence_level inválido")
        if set(deep["asset_diseases"].get(asset_id, [])) - disease_ids or not deep["asset_diseases"].get(asset_id):
            errors.append(f"activo {asset_id} sin enfermedad de la capa profunda")
    errors += [f"proyecto NIH {r['project_num']} sin url" for r in deep["research"] if not is_url(r["url"])]
    return errors


def check_schemas(deep: dict) -> str:
    try:
        sys.path.insert(0, str(ROOT))
        from app import schemas
    except ImportError:
        return "esquemas no validados (sin pydantic: use uv run)"
    for model, key in ((schemas.Disease, "diseases"), (schemas.Gene, "genes"), (schemas.Mechanism, "mechanisms"),
                       (schemas.Edge, "edges"), (schemas.PatientGroup, "patient_groups"), (schemas.Asset, "assets")):
        for item in deep[key]:
            model.model_validate(item)
    return "esquemas OK"


def main() -> int:
    if not DEEP.exists():
        print("DEEP_CHECK_FAIL: falta app/fixtures/deep/deep.json (python3 data/curate/build.py)")
        return 1
    deep = json.loads(DEEP.read_text(encoding="utf-8"))
    errors = check(deep)
    if errors:
        print("DEEP_CHECK_FAIL: " + "; ".join(errors))
        return 1
    try:
        schema_note = check_schemas(deep)
    except Exception as error:  # pydantic.ValidationError
        print(f"DEEP_CHECK_FAIL: esquema: {error}")
        return 1
    print(f"DEEP_CHECK_PASS: {len(deep['diseases'])} enfermedades, {len(deep['edges'])} aristas con fuente, "
          f"{len(deep['patient_groups'])} grupos, {len(deep['assets'])} activos; {schema_note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
