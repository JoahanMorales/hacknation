"""Nodo, arista y explicación para la familia sobre la capa profunda curada (HACK-009).

La explicación la redacta gpt-6.1-sol citando sólo aristas recibidas como `[edge_id]`; el backend
borra cualquier cita a un ID que no exista. DEMO_MODE, sin clave, error de OpenAI o texto sin citas
válidas → respuesta grabada del caso o texto armado con los resúmenes curados de las aristas.
"""

import json
import re
from functools import lru_cache
from pathlib import Path

from openai import OpenAIError

from app.config import settings

ROOT = Path(__file__).resolve().parents[2]
DEEP = ROOT / "app" / "fixtures" / "deep" / "deep.json"
RECORDED = ROOT / "app" / "fixtures" / "deep" / "explain_recorded.json"
ANNOTATIONS = ROOT / "app" / "fixtures" / "graph" / "annotations.json"

EXPLAIN_MODEL = "gpt-6.1-sol"
CITATION = re.compile(r"\[([A-Za-z0-9_.:-]+)\]")
SYMPTOM_LIMIT = 6
EVIDENCE_NOTE = {
    "observado": {"en": "observed", "es": "observado"},
    "inferido": {"en": "inferred, not yet tested in patients", "es": "inferido, sin probar en pacientes"},
    "hipotesis": {"en": "a hypothesis, untested", "es": "una hipótesis sin probar"},
    "contradictorio": {"en": "contradictory evidence", "es": "evidencia contradictoria"},
}
INSTRUCTIONS = {
    "en": "Explain to a patient's family, in plain English (max 4 short sentences), how the given disease connects "
          "to others. Use ONLY the edges provided. After every claim cite its edge as [edge_id]. Respect "
          "evidence_level: say clearly when a link is a hypothesis or untested. No medical advice, no new facts.",
    "es": "Explica a la familia de un paciente, en español sencillo (máximo 4 frases cortas), cómo la enfermedad "
          "se conecta con otras. Usa SÓLO las aristas recibidas. Tras cada afirmación cita su arista como "
          "[edge_id]. Respeta evidence_level: di claramente cuando un vínculo es hipótesis o no está probado. "
          "Sin consejos médicos ni datos nuevos.",
}


class NotInDeepLayer(LookupError):
    pass


@lru_cache(maxsize=1)
def deep() -> dict:
    return json.loads(DEEP.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def annotations() -> tuple[dict, dict]:
    data = json.loads(ANNOTATIONS.read_text(encoding="utf-8"))
    return data["diseases"], data["labels"]


def _envelope() -> dict:
    return {"schema_version": "1.0", "demo_data": False, "sources": []}


def edge(edge_id: str) -> dict:
    for item in deep()["edges"]:
        if item["id"] == edge_id:
            return {**_envelope(), "edge": item}
    raise NotInDeepLayer(f"Edge {edge_id} is not in the curated deep layer")


def node(disease_id: str) -> dict:
    layer = deep()
    disease = next((d for d in layer["diseases"] if d["id"] == disease_id), None)
    if disease is None:
        raise NotInDeepLayer(f"{disease_id} is outside the curated deep layer (Pompe, dystroglycanopathies, LGMD)")
    freqs, labels = annotations()
    known = sorted(((f, t) for t, f in freqs.get(disease_id, {}).items() if f is not None), key=lambda x: (-x[0], x[1]))
    edges = [e for e in layer["edges"] if disease_id in (e["src"], e["dst"])]
    genes = [g for g in layer["genes"] if disease_id in g["disease_ids"]]
    mechanisms = [m for m in layer["mechanisms"] if m["id"] in disease["mechanism_ids"]]
    summary = (
        f"{disease['name']}: {', '.join(g['symbol'] for g in genes)} gene; "
        f"{'; '.join(m['name'] for m in mechanisms)}. {len(edges)} cited connections in the deep layer."
    )
    return {
        **_envelope(), "disease": disease, "genes": genes, "mechanisms": mechanisms, "summary": summary,
        "symptoms_for": [{"hpo_id": t, "label": labels[t], "present": True, "quote": None}
                         for f, t in known if f > 0][:SYMPTOM_LIMIT],
        "symptoms_against": [{"hpo_id": t, "label": labels[t], "present": False, "quote": None}
                             for f, t in known if f == 0][:SYMPTOM_LIMIT],
        "edges": edges,
    }


def clean_citations(text: str, allowed: dict) -> tuple[str, list[dict]]:
    """Quita `[id]` desconocidos y devuelve las citas válidas en orden de aparición."""
    cited: list[str] = []

    def keep(match: re.Match) -> str:
        edge_id = match.group(1)
        if edge_id not in allowed:
            return ""
        if edge_id not in cited:
            cited.append(edge_id)
        return match.group(0)

    cleaned = re.sub(r"\s+([.,;])", r"\1", re.sub(r" {2,}", " ", CITATION.sub(keep, text))).strip()
    return cleaned, [{"edge_id": e, "source_url": allowed[e]["source_url"]} for e in cited]


def _names() -> dict:
    return {d["id"]: d["name"] for d in deep()["diseases"]}


def _template(disease_id: str, edges: list[dict], language: str, reason: str) -> dict:
    sentences = [
        f"{e['summary']} ({EVIDENCE_NOTE[e['evidence_level']][language]}) [{e['id']}]" for e in edges
    ]
    text, citations = clean_citations(" ".join(sentences), {e["id"]: e for e in edges})
    return {**_envelope(), "demo_data": True, "disease_id": disease_id, "text": text, "citations": citations,
            "generation_method": f"Curated edge summaries, no LLM ({reason})"}


def _recorded(disease_id: str, edges: list[dict], language: str, reason: str) -> dict:
    if RECORDED.exists():
        for record in json.loads(RECORDED.read_text(encoding="utf-8")):
            if (record["disease_id"], sorted(record["edge_ids"]), record["language"]) == (
                    disease_id, sorted(e["id"] for e in edges), language):
                return {**record["response"], "demo_data": True,
                        "generation_method": f"{record['response']['generation_method']}; recorded ({reason})"}
    return _template(disease_id, edges, language, reason)


def _generate(disease_id: str, edges: list[dict], language: str) -> str:
    from openai import OpenAI

    names = _names()
    payload = {
        "disease": {"id": disease_id, "name": names.get(disease_id, disease_id)},
        "edges": [{"edge_id": e["id"], "from": names.get(e["src"], e["src"]), "to": names.get(e["dst"], e["dst"]),
                   "type": e["type"], "summary": e["summary"], "evidence_level": e["evidence_level"],
                   "confidence_note": e["confidence_note"]} for e in edges],
    }
    client = OpenAI(api_key=settings.openai_api_key, timeout=30, max_retries=1)
    return client.responses.create(model=EXPLAIN_MODEL, instructions=INSTRUCTIONS[language],
                                   input=json.dumps(payload, ensure_ascii=False)).output_text


def explain(disease_id: str, edge_ids: list[str], language: str) -> dict:
    edges = [e for e in deep()["edges"] if e["id"] in set(edge_ids)]
    if not edges:
        raise NotInDeepLayer("None of the requested edges exist in the curated deep layer")
    if settings.demo_mode or not settings.openai_api_key:
        return _recorded(disease_id, edges, language, "DEMO_MODE or no API key")
    try:
        raw = _generate(disease_id, edges, language)
    except OpenAIError as error:
        return _recorded(disease_id, edges, language, f"OpenAI unavailable ({type(error).__name__})")
    text, citations = clean_citations(raw, {e["id"]: e for e in edges})
    if not citations:
        return _template(disease_id, edges, language, "model text had no valid citations")
    return {**_envelope(), "disease_id": disease_id, "text": text, "citations": citations,
            "generation_method": f"{EXPLAIN_MODEL}; citations restricted to supplied edges, unknown IDs removed"}
