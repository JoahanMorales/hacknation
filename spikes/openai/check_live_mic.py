"""Prueba el dictado EN VIVO de punta a punta en Chromium con un micrófono falso (HACK-017 + HACK-008).

Genera el audio del dictado del caso con TTS de OpenAI y se lo da a Chromium como micrófono. Recorre:
POST /api/transcribe/session → WebRTC con gpt-live-transcribe → deltas → /api/symptoms/extract → chips →
/api/diagnose y /api/next-question. Requiere OPENAI_API_KEY en .env y la app SIN DEMO_MODE:
  npm --prefix web run build && uv run uvicorn app.main:app --port 8000 &
  uv run python spikes/openai/check_live_mic.py --url http://127.0.0.1:8000
No imprime la clave ni el token efímero. Chromium repite el WAV en bucle: el texto puede duplicarse.

Hallazgo (2026-10-03, voz TTS "alloy"): en inglés la transcripción es idéntica al caso. En español es
intermitente (2-5 chips): gpt-live-transcribe oye "presión espiratoria" como "presión inspiratoria" y a veces
"ni cardiomegalia" como "Mi cardiomegalia" (negación perdida). Para la demo: dictado en vivo en inglés, o
"Play sample case" en español.
"""

import argparse
import json
import os
import tempfile
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
CASE = json.loads((ROOT / "app" / "fixtures" / "case" / "pompe_case.json").read_text(encoding="utf-8"))


def api_key() -> str:
    env = ROOT / ".env"
    for line in env.read_text().splitlines() if env.exists() else []:
        key, _, value = line.partition("=")
        if key.strip() == "OPENAI_API_KEY" and value.strip():
            return value.strip()
    return os.environ["OPENAI_API_KEY"]


def tts_wav(text: str, path: Path) -> None:
    body = json.dumps({"model": "gpt-4o-mini-tts", "voice": "alloy", "response_format": "wav", "input": text}).encode()
    request = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=body, headers={
        "Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        path.write_bytes(response.read())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--language", choices=["en", "es"], default="en")
    parser.add_argument("--seconds", type=int, default=22)
    args = parser.parse_args()
    wav = Path(tempfile.gettempdir()) / f"constellation-case-{args.language}.wav"
    tts_wav(CASE[f"transcript_{args.language}"], wav)
    calls, errors = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
                                          f"--use-file-for-fake-audio-capture={wav}"])
        page = browser.new_context(viewport={"width": 1440, "height": 900}, permissions=["microphone"]).new_page()
        page.on("console", lambda m: m.type == "error" and errors.append(m.text[:160]))
        page.on("request", lambda r: r.method == "POST" and calls.append(r.url.split("?")[0].rsplit("/", 2)[-2:]))
        page.goto(args.url)
        page.get_by_role("button", name="Start dictation").click()
        started = time.time()
        page.get_by_text("Listening").first.wait_for(timeout=20000)
        listening = time.time() - started
        page.wait_for_timeout(args.seconds * 1000)
        chips = page.get_by_label("Symptoms").locator("li").count()
        page.screenshot(path=str(Path(tempfile.gettempdir()) / "constellation-live-mic.png"))
        browser.close()
    endpoints = {"/".join(c) for c in calls}
    required = {"transcribe/session", "realtime/calls", "symptoms/extract", "api/diagnose"}
    missing = sorted(r for r in required if not any(e.endswith(r) for e in endpoints))
    if missing or chips < 5 or errors:
        print(f"LIVE_MIC_FAIL: missing={missing} chips={chips} errors={errors[:3]}")
        return 1
    print(f"LIVE_MIC_PASS: listening en {listening:.1f}s, {chips} chips, llamadas {sorted(endpoints)}, consola sin errores")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
