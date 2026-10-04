"""Verifica el inspector (HACK-019) en Chromium.

Uso, con la web compilada y FastAPI en DEMO_MODE:
  DEMO_MODE=true uv run uvicorn app.main:app --port 8000 &
  uv run python web/src/features/inspector/check_inspector.py http://127.0.0.1:8000 /tmp
"""
import sys

from playwright.sync_api import sync_playwright

base, out = sys.argv[1], sys.argv[2]
errors = []
with sync_playwright() as p:
    page = p.chromium.launch().new_page(viewport={"width": 1440, "height": 900})
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.goto(f"{base}/?select=ORPHA:34515")
    page.get_by_role("heading", name="FKRP-related limb-girdle muscular dystrophy R9").wait_for(timeout=10000)
    page.screenshot(path=f"{out}/inspector-summary.png")
    page.get_by_role("button", name="Explain for the family").click()
    cite = page.get_by_role("button", name="Source 1:", exact=False).first
    cite.wait_for(timeout=30000)
    edge_id = cite.get_attribute("aria-label").rsplit(" ", 1)[-1]
    cite.click()
    edge = page.locator(f"#edge-{edge_id}")
    edge.wait_for(timeout=5000)
    assert "border-accent" in edge.get_attribute("class"), "la cita no resalta la arista"
    assert page.get_by_text("Hypothesis").first.is_visible(), "falta EvidenceBadge con texto"
    assert page.get_by_role("link", name="Read source").count() >= 3
    page.screenshot(path=f"{out}/inspector-evidence.png")
    # Revisión de zoe-1: con /api/explain caído no se acepta un ejemplo cuyas citas no son aristas reales.
    page.route("**/api/explain", lambda route: route.fulfill(status=503, body="down"))
    page.goto(f"{base}/?select=ORPHA:34515")
    page.get_by_role("button", name="Explain for the family").click()
    page.get_by_text("The explanation could not be generated.").wait_for(timeout=10000)
    assert page.get_by_role("button", name="Source 1:", exact=False).count() == 0, "cita sin arista real"
    page.unroute("**/api/explain")
    page.goto(f"{base}/?select=OMIM:310200")
    page.get_by_text("Outside the curated deep layer").wait_for(timeout=10000)
    page.goto(f"{base}/")
    assert page.get_by_label("Disease inspector").count() == 0, "inspector abierto sin selectedId"
real = [e for e in errors if not any(code in e for code in ("404", "405", "503"))]
assert not real, real
print("INSPECTOR_PASS: summary, explain + citation highlight, explain 503 error, evidence badges, 404 empty state, closed without selectedId")
