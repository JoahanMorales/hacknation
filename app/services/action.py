"""Plan de acción para Maria a partir de la capa profunda curada (HACK-009).

Nunca recomienda tratamientos: el paso de la semana es contactar, preguntar o probar.
Toda cifra de la línea de tiempo sale de IDEA.md §11 con su fuente.
"""

import json
from functools import lru_cache
from pathlib import Path

DEEP = Path(__file__).resolve().parent.parent / "fixtures" / "deep" / "deep.json"

# Aristas que conectan comunidades o activos; differential_diagnosis es del paso clínico, no de Maria.
BRIDGE_TYPES = {"shared_pathway", "same_mechanism_family", "therapy_bridge", "allelic_series"}
# Orden en que un activo sirve para dar un primer paso sin decisión clínica.
CONTACT_ORDER = ["registro", "historia_natural", "biomarcador", "ensayo"]

EURORDIS_URL = "https://www.nature.com/articles/s41431-024-01604-z"
DBS_URL = "https://www.sciencedirect.com/science/article/abs/pii/S0960896615001339"
POMPE = "OMIM:621314"

SOURCES = [
    {"name": "EURORDIS Rare Barometer (Eur J Hum Genet 2024)", "url": EURORDIS_URL, "version": "2024"},
]

NEEDS_EXPERT = [
    "Confirm the diagnosis and its genetic basis with the treating specialist.",
    "Confirm registry or study eligibility directly with the study team.",
    "Judge whether any research evidence applies to this patient; this plan does not.",
]


@lru_cache
def deep() -> dict:
    return json.loads(DEEP.read_text(encoding="utf-8"))


def _name(data: dict, disease_id: str) -> str:
    return next((d["name"] for d in data["diseases"] if d["id"] == disease_id), disease_id)


def _this_week(data: dict, disease_id: str, groups: list[dict], assets: list[dict]) -> dict:
    ranked = sorted(assets, key=lambda a: CONTACT_ORDER.index(a["kind"]))
    if ranked and ranked[0]["kind"] in ("registro", "historia_natural"):
        asset = ranked[0]
        return {
            "action": f"Contact the {asset['name']} ({asset['id']}) to ask about eligibility and what data it already holds.",
            "url": asset["url"],
        }
    if groups:
        return {
            "action": f"Contact {groups[0]['name']} to ask which registry and families are already organized for {_name(data, disease_id)}.",
            "url": groups[0]["url"],
        }
    return {
        "action": "Ask a specialist which disease-specific registry or patient organization is appropriate.",
        "url": None,
    }


def _timeline(disease_id: str, this_week: dict) -> dict:
    if disease_id == POMPE:
        proposed = {
            "label": "Dried blood spot GAA test requested at the first neuromuscular visit (guideline)",
            "duration": "First visit",
            "source_url": DBS_URL,
        }
    else:
        proposed = {
            "label": "First contact with an existing registry or organization",
            "duration": "This week",
            "source_url": this_week["url"],
        }
    return {
        "current": {
            "label": "Average time to diagnosis, rare-disease survey (EURORDIS, 6,507 people, 41 countries)",
            "duration": "4.7 years",
            "source_url": EURORDIS_URL,
        },
        "proposed": proposed,
        "assumptions": [
            "4.7 years is a survey average across rare diseases, not a figure for this disease.",
            "The lanes show different starting points, not a measured 10x speed-up.",
            "Contacting a registry or organization is not diagnosis or treatment.",
            "Eligibility, response times and clinical evaluation require confirmation.",
        ],
    }


def _differences(data: dict, bridges: list[dict]) -> list[str]:
    notes = ["A molecular bridge is not evidence of equal phenotype or treatment response."]
    for edge in bridges:
        if edge["evidence_level"] != "observado":
            other = _name(data, edge["dst"])
            notes.append(f"{edge['id']} to {other} is {edge['evidence_level']}: {edge['confidence_note']}")
        if edge["type"] == "allelic_series":
            notes.append(
                f"{edge['id']}: same gene as {_name(data, edge['dst'])} but a different, usually more severe presentation."
            )
    return notes


def build_plan(disease_id: str) -> dict:
    data = deep()
    known = {d["id"] for d in data["diseases"]}
    base = {"schema_version": "1.0", "demo_data": bool(data.get("demo_data")), "sources": SOURCES, "disease_id": disease_id}
    searched = [
        (
            f"Curated deep layer ({len(data['patient_groups'])} patient organizations, "
            f"{len(data['assets'])} registries/studies, {len(data['edges'])} cited edges; "
            f"verified {data.get('verified_at', 'n/a')})"
        )
    ]
    if disease_id not in known:
        return base | {
            "supported": False,
            "groups": [], "assets": [], "bridges": [], "differences": [],
            "needs_expert": ["Ask a specialist to review evidence for the selected disease."],
            "this_week": _this_week(data, disease_id, [], []),
            "timeline": None,
            "searched": searched,
            "missing_evidence": [
                f"{disease_id} is outside the curated cluster; no route has been curated. This does not mean none exists."
            ],
        }

    groups = [g for g in data["patient_groups"] if disease_id in g["diseases"]]
    assets = [a for a in data["assets"] if disease_id in data["asset_diseases"].get(a["id"], [])]
    bridges = [
        e for e in data["edges"]
        if e["type"] in BRIDGE_TYPES and disease_id in (e["src"], e["dst"])
    ]
    # Orienta la arista desde la enfermedad elegida para que `dst` sea siempre la comunidad puente.
    bridges = [e if e["src"] == disease_id else e | {"src": e["dst"], "dst": e["src"]} for e in bridges]
    this_week = _this_week(data, disease_id, groups, assets)
    supported = bool(groups or assets)
    missing = [] if supported else [
        "No patient organization or registry is curated for this disease yet. This does not mean none exists."
    ]
    if not assets:
        missing.append("No registry or natural-history study is curated for this disease.")
    return base | {
        "supported": supported,
        "groups": groups,
        "assets": assets,
        "bridges": bridges,
        "differences": _differences(data, bridges),
        "needs_expert": NEEDS_EXPERT,
        "this_week": this_week,
        "timeline": _timeline(disease_id, this_week) if supported else None,
        "searched": searched,
        "missing_evidence": missing,
    }
