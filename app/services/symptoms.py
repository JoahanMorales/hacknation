"""Dictado → términos HPO con negación, y token efímero de transcripción (HACK-004: spikes/openai/RESULT.md).

1. Buscador local de etiquetas y sinónimos exactos de HPO → candidatos (en español, sobre una
   traducción previa: HPO sólo trae sinónimos en inglés).
2. gpt-6-luna elige entre esos candidatos con JSON Schema estricto (`enum` de IDs); un ID desconocido se descarta.
3. DEMO_MODE, sin clave o error de OpenAI → respuestas grabadas del spike (`demo_data: true`).
La API key nunca sale del backend: el navegador recibe un token efímero `ek_...`.
"""

import json
import re
from functools import lru_cache
from pathlib import Path

import httpx
from openai import OpenAIError

from app.config import settings

ROOT = Path(__file__).resolve().parents[2]
ANNOTATIONS = ROOT / "app" / "fixtures" / "graph" / "annotations.json"
RECORDED = ROOT / "spikes" / "openai" / "recorded"

EXTRACT_MODEL = "gpt-6-luna"
LIVE_MODEL = "gpt-live-transcribe"
CANDIDATE_LIMIT = 30
SESSION_SECONDS = 600
KEYWORDS = {
    "en": ["creatine kinase", "CK", "maximal inspiratory pressure", "maximal expiratory pressure", "Pompe", "GAA",
           "FKRP", "limb-girdle", "cardiomyopathy", "cardiomegaly", "hyperCKemia"],
    "es": ["creatina quinasa", "CK", "presión inspiratoria máxima", "presión espiratoria máxima", "Pompe", "GAA",
           "FKRP", "cinturas", "cardiomiopatía", "cardiomegalia", "hiperCKemia"],
}
STOPWORDS = frozenset((
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is", "it", "no", "not",
    "of", "on", "or", "the", "there", "this", "to", "with", "which", "these", "that", "abnormality", "abnormal",
))
EXTRACT_INSTRUCTIONS = (
    "You map a clinician's dictation to HPO terms. Choose ONLY from the candidate list. "
    "Return one item per finding that the dictation states; present=false when the dictation negates it. "
    "quote = the exact words from the dictation (any language). Do not add findings that are not said."
)
TRANSLATE_INSTRUCTIONS = "Translate this clinical dictation into English. Output only the translation."


def tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w[:-1] if len(w) > 4 and w.endswith("s") else w for w in words if w not in STOPWORDS}


@lru_cache(maxsize=1)
def hpo_index() -> tuple[dict, list]:
    data = json.loads(ANNOTATIONS.read_text(encoding="utf-8"))
    labels = data["labels"]
    names = []
    for hpo_id, label in labels.items():
        for name in [label, *data.get("synonyms", {}).get(hpo_id, [])]:
            name_tokens = tokens(name)
            if name_tokens:
                names.append((hpo_id, frozenset(name_tokens)))
    return labels, names


def candidates(text: str, limit: int = CANDIDATE_LIMIT) -> list[dict]:
    labels, names = hpo_index()
    words = tokens(text)
    best: dict[str, tuple] = {}
    for hpo_id, name_tokens in names:
        overlap = len(name_tokens & words)
        score = overlap / len(name_tokens)
        if score >= 0.67 and (score, overlap) > best.get(hpo_id, (0, 0)):
            best[hpo_id] = (score, overlap)
    ranked = sorted(best.items(), key=lambda kv: (-kv[1][0], -kv[1][1], kv[0]))[:limit]
    return [{"hpo_id": hpo_id, "label": labels[hpo_id]} for hpo_id, _ in ranked]


def _openai():
    from openai import OpenAI

    return OpenAI(api_key=settings.openai_api_key, timeout=20, max_retries=1)


def _translate(text: str) -> str:
    return _openai().responses.create(model=EXTRACT_MODEL, instructions=TRANSLATE_INSTRUCTIONS, input=text).output_text


def _choose(transcript: str, candidate_terms: list[dict]) -> list[dict]:
    schema = {
        "type": "object", "additionalProperties": False, "required": ["terms"],
        "properties": {"terms": {"type": "array", "items": {
            "type": "object", "additionalProperties": False, "required": ["hpo_id", "present", "quote"],
            "properties": {"hpo_id": {"type": "string", "enum": [c["hpo_id"] for c in candidate_terms]},
                           "present": {"type": "boolean"}, "quote": {"type": "string"}}}}},
    }
    response = _openai().responses.create(
        model=EXTRACT_MODEL, instructions=EXTRACT_INSTRUCTIONS,
        input=json.dumps({"dictation": transcript, "candidates": candidate_terms}, ensure_ascii=False),
        text={"format": {"type": "json_schema", "name": "hpo_terms", "strict": True, "schema": schema}},
    )
    return json.loads(response.output_text)["terms"]


def recorded(language: str, reason: str) -> dict:
    record = json.loads((RECORDED / f"extract_{language}.json").read_text(encoding="utf-8"))
    labels, _ = hpo_index()
    return {
        "schema_version": "1.0", "demo_data": True, "sources": [],
        "terms": [{**t, "label": labels.get(t["hpo_id"], t["hpo_id"])} for t in record["terms"]],
        "extraction_method": f"Recorded {record['model']} response for the sample case (HACK-004); {reason}",
    }


def extract(transcript: str, language: str) -> dict:
    if settings.demo_mode or not settings.openai_api_key:
        return recorded(language, "DEMO_MODE or no API key")
    try:
        search_text = transcript if language == "en" else f"{transcript}\n{_translate(transcript)}"
        candidate_terms = candidates(search_text)
        chosen = _choose(transcript, candidate_terms) if candidate_terms else []
    except (OpenAIError, httpx.HTTPError, OSError, ValueError, KeyError) as error:  # red, cuota o modelo → grabado
        return recorded(language, f"OpenAI unavailable ({type(error).__name__})")
    allowed = {c["hpo_id"]: c["label"] for c in candidate_terms}
    terms, seen = [], set()
    for term in chosen:
        if term["hpo_id"] in allowed and term["hpo_id"] not in seen:  # ID desconocido o repetido → fuera
            seen.add(term["hpo_id"])
            terms.append({**term, "label": allowed[term["hpo_id"]]})
    return {
        "schema_version": "1.0", "demo_data": False, "sources": [], "terms": terms,
        "extraction_method": f"Local HPO synonym search ({len(candidate_terms)} candidates) + {EXTRACT_MODEL} "
                             "structured output restricted to candidate IDs",
    }


def sample_session(reason: str) -> dict:
    return {"schema_version": "1.0", "demo_data": True, "sources": [], "client_secret": "SAMPLE_NOT_A_TOKEN",
            "expires_at": 0, "model": f"sample-only ({reason})", "usable": False}


def transcribe_session() -> dict:
    """Token efímero para que el navegador abra la sesión WebRTC de gpt-live-transcribe."""
    if settings.demo_mode or not settings.openai_api_key:
        return sample_session("DEMO_MODE or no API key")
    session = {"type": "transcription", "audio": {"input": {
        "format": {"type": "audio/pcm", "rate": 24000},
        "transcription": {"model": LIVE_MODEL, "languages": ["en", "es"], "delay": "low",
                          "keywords": KEYWORDS["en"] + KEYWORDS["es"]},
        "turn_detection": None}}}
    try:
        response = httpx.post(
            "https://api.openai.com/v1/realtime/client_secrets", timeout=15,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"expires_after": {"anchor": "created_at", "seconds": SESSION_SECONDS}, "session": session},
        )
        response.raise_for_status()
        body = response.json()
    except httpx.HTTPError as error:
        return sample_session(f"OpenAI unavailable ({type(error).__name__})")
    return {"schema_version": "1.0", "demo_data": False, "sources": [], "client_secret": body["value"],
            "expires_at": body["expires_at"], "model": LIVE_MODEL, "usable": True}
