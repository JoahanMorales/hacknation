"""Mide la app en modo edge (sin OpenAI): arranque, memoria y latencia por endpoint (HACK-016).

Uso, desde la raíz del repo y con la web compilada (npm --prefix web run build):
  uv run python spikes/edge/measure.py --port 8016
Arranca su propio uvicorn con DEMO_MODE=true y sin OPENAI_API_KEY, así nada sale a la red.
"""

import argparse
import json
import os
import statistics
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CASE = json.loads((ROOT / "app" / "fixtures" / "case" / "pompe_case.json").read_text(encoding="utf-8"))
TERMS = [{"hpo_id": t["hpo_id"], "label": t["label"], "present": t["present"]} for t in CASE["terms"]]
CALLS = [
    ("GET /", "GET", "/", None),
    ("GET /api/graph/overview", "GET", "/api/graph/overview", None),
    ("POST /api/symptoms/extract", "POST", "/api/symptoms/extract", {"transcript": CASE["transcript_en"]}),
    ("POST /api/diagnose", "POST", "/api/diagnose", {"terms": TERMS}),
    ("POST /api/next-question", "POST", "/api/next-question", {"terms": TERMS}),
    ("GET /api/node/{id}", "GET", "/api/node/ORPHA:34515", None),
    ("POST /api/explain", "POST", "/api/explain", {"disease_id": "ORPHA:34515", "edge_ids": ["E04", "E05", "E06"]}),
    ("POST /api/action-plan", "POST", "/api/action-plan", {"disease_id": "ORPHA:34515"}),
    ("POST /api/transcribe/session", "POST", "/api/transcribe/session", {}),
]


def call(base: str, method: str, path: str, body) -> tuple[float, int, dict | None]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(base + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"})
    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read()
    elapsed = (time.perf_counter() - started) * 1000
    payload = json.loads(raw) if response.headers.get_content_type() == "application/json" else None
    return elapsed, len(raw), payload


def rss_mb(pid: int) -> float:
    for line in Path(f"/proc/{pid}/status").read_text().splitlines():
        if line.startswith("VmRSS:"):
            return int(line.split()[1]) / 1024
    return 0.0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--port", type=int, default=8016)
    parser.add_argument("--runs", type=int, default=5)
    args = parser.parse_args()
    base = f"http://127.0.0.1:{args.port}"
    env = {**os.environ, "DEMO_MODE": "true", "OPENAI_API_KEY": ""}
    started = time.perf_counter()
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(args.port)],
        cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        while True:
            try:
                call(base, "GET", "/api/health", None)
                break
            except OSError:
                if time.perf_counter() - started > 60:
                    raise
                time.sleep(0.1)
        boot = time.perf_counter() - started
        rows = []
        for name, method, path, body in CALLS:
            first, size, payload = call(base, method, path, body)
            warm = [call(base, method, path, body)[0] for _ in range(args.runs)]
            demo = payload.get("demo_data") if isinstance(payload, dict) else None
            rows.append((name, first, statistics.median(warm), size, demo))
        print(json.dumps({
            "boot_s": round(boot, 2), "rss_mb": round(rss_mb(server.pid), 1),
            "endpoints": [{"call": n, "first_ms": round(f), "warm_median_ms": round(w), "bytes": s, "demo_data": d}
                          for n, f, w, s, d in rows],
        }, indent=1))
    finally:
        server.terminate()
        server.wait(timeout=10)
    return 0


if __name__ == "__main__":
    sys.exit(main())
