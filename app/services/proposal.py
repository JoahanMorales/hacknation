"""Propuesta de colaboración con fuentes para Maria (HACK-026).

"She approaches a partner with a sourced proposal" (brief del reto 05). Se arma el contexto curado de la
enfermedad y de su socio (aristas, grupos, registros y estudios) y cada fuente recibe una clave citable.
gpt-6.1-sol redacta citando sólo esas claves; el backend borra cualquier otra. Las preguntas para revisión
experta se derivan de los niveles de evidencia, no del modelo. DEMO_MODE, sin clave o fallo → grabación real
o texto armado con los mismos datos.
"""

import json
import re
from functools import lru_cache
from pathlib import Path

from openai import OpenAIError

from app.config import settings

ROOT = Path(__file__).resolve().parents[2]
DEEP = ROOT / "app" / "fixtures" / "deep" / "deep.json"
OVERVIEW = ROOT / "app" / "fixtures" / "graph" / "overview.json"
RECORDED = ROOT / "app" / "fixtures" / "proposal" / "proposal_recorded.json"

MODEL = "gpt-6.1-sol"
CITATION = re.compile(r"\[([A-Za-z0-9_.:-]+)\]")
# El socio preferido es el que comparte mecanismo con evidencia más fuerte, luego el diferencial.
PARTNER_PRIORITY = {"therapy_bridge": 0, "shared_pathway": 1, "same_mechanism_family": 2, "differential_diagnosis": 3}
EVIDENCE_TEXT = {"observado": "observed", "inferido": "inferred", "hipotesis": "hypothesis",
                 "contradictorio": "contradicted"}
INSTRUCTIONS = (
    "Write a one-page collaboration proposal from a patient-organization leader to a partner community, in "
    "plain English for non-specialists. Use ONLY the facts in the JSON. After every factual sentence cite its "
    "source key in square brackets, e.g. [E04] or [A1]. Sections, as markdown headings: 'Why we should talk', "
    "'What already exists that we could share', 'What is different between our diseases', 'What we propose "
    "this month'. Say plainly when a link is inferred, a hypothesis or untested. Never recommend a treatment, "
    "never promise results, never add numbers that are not in the JSON. Under 280 words. Do not write the "
    "expert questions; they are added separately."
)


class NotSupported(LookupError):
    pass


@lru_cache(maxsize=1)
def data() -> tuple[dict, dict]:
    deep = json.loads(DEEP.read_text(encoding="utf-8"))
    names = {n["id"]: n["name"] for n in json.loads(OVERVIEW.read_text(encoding="utf-8"))["nodes"]}
    return deep, names


def default_partner(disease_id: str) -> str | None:
    deep, _ = data()
    options = [(PARTNER_PRIORITY.get(e["type"], 9), -e["confidence"], e["dst"] if e["src"] == disease_id else e["src"])
               for e in deep["edges"] if disease_id in (e["src"], e["dst"]) and e["type"] in PARTNER_PRIORITY]
    return min(options)[2] if options else None


def context(disease_id: str, partner_id: str) -> dict:
    deep, names = data()
    curated = {d["id"] for d in deep["diseases"]}
    if disease_id not in curated or partner_id not in curated or disease_id == partner_id:
        raise NotSupported("Both diseases must be distinct members of the curated deep layer")
    pair = {disease_id, partner_id}
    gene = {d: g["symbol"] for g in deep["genes"] for d in g["disease_ids"]}
    sources = []

    def add(key: str, kind: str, label: str, url: str, **fact) -> None:
        sources.append({"key": key, "kind": kind, "label": label, "url": url, **fact})

    for e in deep["edges"]:
        if {e["src"], e["dst"]} == pair or (e["type"] == "allelic_series" and disease_id in (e["src"], e["dst"])):
            add(e["id"], "edge", f"{names[e['src']]} ↔ {names[e['dst']]}", e["source_url"], type=e["type"],
                evidence=EVIDENCE_TEXT[e["evidence_level"]], summary=e["summary"], note=e["confidence_note"])
    for i, group in enumerate(g for g in deep["patient_groups"] if pair & set(g["diseases"])):
        add(f"G{i + 1}", "group", group["name"], group["url"],
            serves=[names[d] for d in group["diseases"] if d in pair])
    for i, asset in enumerate(a for a in deep["assets"] if pair & set(deep["asset_diseases"].get(a["id"], []))):
        status = deep["asset_status"].get(asset["id"], {}).get("status")
        add(f"A{i + 1}", "asset", asset["name"], asset["url"], id=asset["id"], asset_kind=asset["kind"],
            status=status, for_diseases=[names[d] for d in deep["asset_diseases"][asset["id"]] if d in pair])
    return {
        "from": {"id": disease_id, "name": names[disease_id], "gene": gene.get(disease_id)},
        "to": {"id": partner_id, "name": names[partner_id], "gene": gene.get(partner_id)},
        "sources": sources,
    }


def expert_questions(ctx: dict) -> list[str]:
    """Preguntas derivadas de los datos: lo inferido, lo hipotético y lo que el registro debe confirmar."""
    questions = []
    for s in ctx["sources"]:
        if s["kind"] == "edge" and s["evidence"] in ("inferred", "hypothesis"):
            questions.append(f"The link '{s['summary']}' is {s['evidence']}: what experiment or data would "
                             f"confirm it for both diseases? [{s['key']}]")
        if s["kind"] == "edge" and s["type"] == "allelic_series":
            questions.append(f"Same gene, different picture: which patients does the shared work really apply "
                             f"to? [{s['key']}]")
        if s["kind"] == "asset" and s["asset_kind"] == "registro":
            questions.append(f"Can families with {ctx['to']['name']} join or reuse {s['label']}, and what are its "
                             f"eligibility rules? [{s['key']}]")
    questions.append(f"Do both diagnoses ({ctx['from']['gene'] or 'gene unknown'} and "
                     f"{ctx['to']['gene'] or 'gene unknown'}) need genetic confirmation before pooling data?")
    return questions


def clean(text: str, keys: set[str]) -> tuple[str, list[str]]:
    cited: list[str] = []

    def keep(match: re.Match) -> str:
        key = match.group(1)
        if key not in keys:
            return ""
        if key not in cited:
            cited.append(key)
        return match.group(0)

    text = CITATION.sub(keep, text)
    return re.sub(r"[ \t]+([.,;])", r"\1", re.sub(r"[ \t]{2,}", " ", text)).strip(), cited


def template(ctx: dict) -> str:
    edges = [s for s in ctx["sources"] if s["kind"] == "edge"]
    groups = [s for s in ctx["sources"] if s["kind"] == "group"]
    assets = [s for s in ctx["sources"] if s["kind"] == "asset"]
    lines = ["## Why we should talk"]
    lines += [f"- {s['summary']} ({s['evidence']}) [{s['key']}]" for s in edges if s["type"] != "allelic_series"]
    lines += ["", "## What already exists that we could share"]
    lines += [f"- {s['label']} ({s['id']}) [{s['key']}]" for s in assets]
    lines += [f"- {s['label']}, a patient organization [{s['key']}]" for s in groups]
    lines += ["", "## What is different between our diseases"]
    lines += [f"- {s['summary']} [{s['key']}]" for s in edges if s["type"] == "allelic_series"]
    lines += [(f"- {ctx['from']['name']} and {ctx['to']['name']} are different diseases; shared biology does "
               "not mean shared treatment response.")]
    lines += ["", "## What we propose this month",
              ("- A one-hour call between both organizations to compare registries and decide what data could "
               "be pooled, with an expert reviewing the questions below.")]
    return "\n".join(lines)


def _generate(ctx: dict) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key, timeout=40, max_retries=1)
    return client.responses.create(model=MODEL, instructions=INSTRUCTIONS,
                                   input=json.dumps(ctx, ensure_ascii=False)).output_text


def _recorded(disease_id: str, partner_id: str) -> dict | None:
    if RECORDED.exists():
        for record in json.loads(RECORDED.read_text(encoding="utf-8")):
            if (record["disease_id"], record["partner_disease_id"]) == (disease_id, partner_id):
                return record
    return None


def propose(disease_id: str, partner_id: str | None) -> dict:
    partner_id = partner_id or default_partner(disease_id)
    if partner_id is None:
        raise NotSupported(f"No curated partner disease for {disease_id}")
    ctx = context(disease_id, partner_id)
    keys = {s["key"] for s in ctx["sources"]}
    base = {"schema_version": "1.0", "disease_id": disease_id, "partner_disease_id": partner_id,
            "title": f"Proposal: {ctx['from']['name']} × {ctx['to']['name']}",
            "questions_for_expert": expert_questions(ctx), "sources": ctx["sources"]}
    reason = None
    if settings.demo_mode or not settings.openai_api_key:
        reason = "DEMO_MODE or no API key"
    else:
        try:
            text, cited = clean(_generate(ctx), keys)
            if cited:
                return {**base, "demo_data": False, "markdown": text, "cited_keys": cited,
                        "generation_method": f"{MODEL}; citations restricted to supplied sources, unknown keys removed"}
            reason = "model text had no valid citations"
        except OpenAIError as error:
            reason = f"OpenAI unavailable ({type(error).__name__})"
    record = _recorded(disease_id, partner_id)
    if record:
        text, cited = clean(record["markdown"], keys)
        return {**base, "demo_data": True, "markdown": text, "cited_keys": cited,
                "generation_method": f"{record['generation_method']}; recorded ({reason})"}
    text, cited = clean(template(ctx), keys)
    return {**base, "demo_data": True, "markdown": text, "cited_keys": cited,
            "generation_method": f"Curated sources assembled without a language model ({reason})"}
