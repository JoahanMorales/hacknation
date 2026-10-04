"""Recorrido de Maria de punta a punta (HACK-033), con tiempos por paso para el guion de la demo (HACK-014).

Búsqueda "LGMD2I" (si la caja de HACK-022 existe; si no, ?select=) → inspector → pathway → Next steps →
Draft a proposal. Uso, con la web compilada y FastAPI arriba (DEMO_MODE=true para tiempos de grabación):
  uv run python web/src/features/action/check_journey.py http://127.0.0.1:8000
"""

import sys
import time

from playwright.sync_api import sync_playwright

base = sys.argv[1]
steps, errors = [], []
with sync_playwright() as p:
    page = p.chromium.launch().new_page(viewport={"width": 1440, "height": 900})
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    started = time.perf_counter()

    def mark(name: str) -> None:
        steps.append((name, round(time.perf_counter() - started, 1)))

    page.goto(base)
    search = page.get_by_role("combobox")
    if search.count():
        search.first.fill("LGMD2I")
        page.get_by_role("option", name="FKRP-related", exact=False).first.click(timeout=15000)
        mark("search LGMD2I")
    else:
        page.goto(f"{base}/?select=ORPHA:34515")
        mark("select ORPHA:34515 (search not in this build)")
    page.get_by_role("button", name="Open pathway", exact=False).click(timeout=30000)
    page.get_by_label("Pathway navigator").wait_for(timeout=15000)
    mark("pathway")
    page.get_by_label("Pathway navigator").get_by_role("button", name="Next steps").click()
    page.get_by_role("button", name="Draft a proposal").wait_for(timeout=20000)
    mark("action plan")
    page.get_by_role("button", name="Draft a proposal").click()
    page.get_by_role("dialog", name="Collaboration proposal").get_by_role(
        "heading", name="Questions for expert review").wait_for(timeout=60000)
    mark("proposal")
real = [e for e in errors if not any(code in e for code in ("404", "405"))]
assert not real, real
print("JOURNEY_PASS: " + " -> ".join(f"{name} {t}s" for name, t in steps))
