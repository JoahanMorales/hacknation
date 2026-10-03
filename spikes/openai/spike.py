#!/usr/bin/env python3
"""Spike OpenAI (HACK-004): extracción estructurada de síntomas → HPO y transcripción en vivo.

Uso:
  uv run python spikes/openai/spike.py --extract     # gpt-6-luna, JSON Schema restringido a IDs candidatos
  uv run python spikes/openai/spike.py --transcribe  # TTS del caso → gpt-live-transcribe (Realtime) con keywords
  python3 spikes/openai/spike.py --check             # sin red: valida spikes/openai/recorded/*.json

Requiere OPENAI_API_KEY en .env (nunca en el código). Las respuestas reales quedan en recorded/
para el modo demo (demo_data: true cuando se sirvan como respaldo).
"""
import argparse
import asyncio
import base64
import json
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CASE = ROOT / "app" / "fixtures" / "case" / "pompe_case.json"
HP_JSON = ROOT / "data" / "raw" / "hp.json"
RECORDED = Path(__file__).resolve().parent / "recorded"

EXTRACT_MODEL = "gpt-6-luna"
LIVE_MODEL = "gpt-live-transcribe"
TTS_MODEL = "gpt-4o-mini-tts"
KEYWORDS = ["creatine kinase", "CK", "maximal inspiratory pressure", "maximal expiratory pressure", "Pompe",
            "GAA", "FKRP", "limb-girdle", "cardiomyopathy", "cardiomegaly", "hyperCKemia"]
STOPWORDS = frozenset(("a", "an", "and", "are", "as", "at", "be", "by", "for", "has", "have", "in", "is", "it",
    "no", "not", "of", "on", "or", "the", "there", "this", "to", "with", "which", "these", "case", "adult",
    "published", "disease", "patterns", "match", "findings"))


def load_env() -> None:
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            key, _, value = line.partition("=")
            if key and value and key not in os.environ:
                os.environ[key.strip()] = value.strip()


def tokens(text: str) -> set:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOPWORDS}


def candidates(transcript: str, limit: int = 25) -> list:
    """Buscador léxico mínimo sobre etiquetas y sinónimos exactos de HPO (HACK-008 hará el real)."""
    graph = json.loads(HP_JSON.read_text(encoding="utf-8"))["graphs"][0]
    words = tokens(transcript)
    scored = {}
    for node in graph["nodes"]:
        if "HP_" not in node["id"] or node.get("meta", {}).get("deprecated") or not node.get("lbl"):
            continue
        hpo_id = node["id"].rsplit("/", 1)[-1].replace("_", ":")
        names = [node["lbl"]] + [s["val"] for s in node.get("meta", {}).get("synonyms", []) if s["pred"] == "hasExactSynonym"]
        for name in names:
            name_tokens = tokens(name)
            if len(name_tokens) == 0:
                continue
            score = len(name_tokens & words) / len(name_tokens)
            if score >= 0.67 and (score, len(name_tokens)) > scored.get(hpo_id, (0, 0, ""))[:2]:
                scored[hpo_id] = (score, len(name_tokens), node["lbl"])
    ranked = sorted(scored.items(), key=lambda kv: (-kv[1][0], -kv[1][1], kv[0]))[:limit]
    return [{"hpo_id": hpo_id, "label": label} for hpo_id, (_, _, label) in ranked]


def extraction_schema(ids: list) -> dict:
    return {
        "type": "object", "additionalProperties": False, "required": ["terms"],
        "properties": {"terms": {"type": "array", "items": {
            "type": "object", "additionalProperties": False, "required": ["hpo_id", "present", "quote"],
            "properties": {"hpo_id": {"type": "string", "enum": ids}, "present": {"type": "boolean"},
                           "quote": {"type": "string"}}}}},
    }


def extract(client, transcript: str, candidate_terms: list) -> tuple:
    instructions = (
        "You map a clinician's dictation to HPO terms. Choose ONLY from the candidate list. "
        "Return one item per finding that the dictation states; present=false when the dictation negates it. "
        "quote = the exact words from the dictation (any language). Do not add findings that are not said."
    )
    started = time.perf_counter()
    response = client.responses.create(
        model=EXTRACT_MODEL,
        instructions=instructions,
        input=json.dumps({"dictation": transcript, "candidates": candidate_terms}, ensure_ascii=False),
        text={"format": {"type": "json_schema", "name": "hpo_terms", "strict": True,
                         "schema": extraction_schema([c["hpo_id"] for c in candidate_terms])}},
    )
    latency = time.perf_counter() - started
    return json.loads(response.output_text), latency, response.model, response.usage.model_dump()


def run_extract() -> None:
    from openai import OpenAI

    client = OpenAI()
    case = json.loads(CASE.read_text(encoding="utf-8"))
    # El buscador es léxico en inglés: para el dictado en español se reutilizan los candidatos del caso en inglés.
    candidate_terms = candidates(case["transcript_en"])
    for language in ("en", "es"):
        result, latency, model, usage = extract(client, case[f"transcript_{language}"], candidate_terms)
        record = {"demo_data": True, "model": model, "latency_s": round(latency, 2), "usage": usage,
                  "language": language, "transcript": case[f"transcript_{language}"],
                  "candidates": candidate_terms, "terms": result["terms"]}
        (RECORDED / f"extract_{language}.json").write_text(json.dumps(record, ensure_ascii=False, indent=1) + "\n")
        print(f"extract {language}: {model} {latency:.2f}s {[(t['hpo_id'], t['present']) for t in result['terms']]}")


async def live_transcribe(pcm: bytes, language: str) -> dict:
    import websockets

    url = "wss://api.openai.com/v1/realtime?intent=transcription"
    headers = {"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"}
    deltas, started = [], time.perf_counter()
    first_delta = None
    async with websockets.connect(url, additional_headers=headers, max_size=None) as ws:
        await ws.send(json.dumps({"type": "session.update", "session": {"type": "transcription", "audio": {"input": {
            "format": {"type": "audio/pcm", "rate": 24000},
            "transcription": {"model": LIVE_MODEL, "keywords": KEYWORDS, "languages": [language], "delay": "low"},
            "turn_detection": None}}}}))
        chunk = 24000 * 2 // 10  # 100 ms de PCM16 mono a 24 kHz, como lo mandaría el micrófono
        for i in range(0, len(pcm), chunk):
            await ws.send(json.dumps({"type": "input_audio_buffer.append", "audio": base64.b64encode(pcm[i:i + chunk]).decode()}))
        await ws.send(json.dumps({"type": "input_audio_buffer.commit"}))
        sent_at = time.perf_counter()
        while True:
            event = json.loads(await asyncio.wait_for(ws.recv(), timeout=60))
            if event["type"] == "conversation.item.input_audio_transcription.delta":
                first_delta = first_delta or time.perf_counter()
                deltas.append(event["delta"])
            elif event["type"] == "conversation.item.input_audio_transcription.completed":
                done = time.perf_counter()
                return {"transcript": event["transcript"], "deltas": len(deltas),
                        "first_delta_s": round((first_delta or done) - started, 2),
                        "after_commit_s": round(done - sent_at, 2)}
            elif event["type"] == "error":
                raise RuntimeError(event["error"])


def run_transcribe() -> None:
    from openai import OpenAI

    client = OpenAI()
    case = json.loads(CASE.read_text(encoding="utf-8"))
    for language in ("en", "es"):
        speech = client.audio.speech.create(model=TTS_MODEL, voice="alloy", input=case[f"transcript_{language}"],
                                            response_format="pcm")
        pcm = speech.content
        result = asyncio.run(live_transcribe(pcm, language))
        record = {"demo_data": True, "model": LIVE_MODEL, "language": language, "keywords": KEYWORDS,
                  "audio": f"{TTS_MODEL} (alloy, PCM16 24 kHz, {len(pcm) / 48000:.1f} s)",
                  "reference": case[f"transcript_{language}"], **result}
        (RECORDED / f"transcribe_{language}.json").write_text(json.dumps(record, ensure_ascii=False, indent=1) + "\n")
        print(f"transcribe {language}: {result['after_commit_s']}s tras commit · {result['transcript']}")


def check() -> list:
    errors = []
    case = json.loads(CASE.read_text(encoding="utf-8"))
    expected = {(t["hpo_id"], t["present"]) for t in case["terms"]}
    for language in ("en", "es"):
        path = RECORDED / f"extract_{language}.json"
        if not path.exists():
            errors.append(f"falta {path.name}")
            continue
        record = json.loads(path.read_text(encoding="utf-8"))
        allowed = {c["hpo_id"] for c in record["candidates"]}
        got = {(t["hpo_id"], t["present"]) for t in record["terms"]}
        if any(t["hpo_id"] not in allowed for t in record["terms"]):
            errors.append(f"{path.name}: ID fuera de los candidatos")
        if not record.get("demo_data"):
            errors.append(f"{path.name}: falta demo_data")
        if expected - got:
            errors.append(f"{path.name}: faltan {sorted(expected - got)}")
        transcribe = RECORDED / f"transcribe_{language}.json"
        if not transcribe.exists() or not json.loads(transcribe.read_text(encoding="utf-8")).get("transcript"):
            errors.append(f"falta o está vacío {transcribe.name}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--extract", action="store_true")
    parser.add_argument("--transcribe", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    load_env()
    RECORDED.mkdir(parents=True, exist_ok=True)
    if args.extract:
        run_extract()
    if args.transcribe:
        run_transcribe()
    if args.check:
        errors = check()
        print("SPIKE_CHECK_FAIL: " + "; ".join(errors) if errors else
              "SPIKE_CHECK_PASS: extracción EN/ES recupera los 5 términos del caso (presentes y negados) y hay transcripción EN/ES")
        return 1 if errors else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
