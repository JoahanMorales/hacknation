"""Verifica la escena de acción (HACK-020) en Chromium.

Uso, con la web compilada y FastAPI arriba:
  uv run python web/src/features/action/check_action.py http://127.0.0.1:8000 /tmp
"""
import sys

from playwright.sync_api import sync_playwright

base, out = sys.argv[1], sys.argv[2]
errors = []
with sync_playwright() as p:
    page = p.chromium.launch().new_page(viewport={"width": 1440, "height": 900})
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.goto(f"{base}/?select=ORPHA:34515&step=action")
    plan = page.get_by_label("Action plan")
    plan.get_by_role("heading", name="Who is already working on this").wait_for(timeout=10000)
    assert plan.get_by_role("link", name="CureLGMD2i").is_visible()
    assert plan.get_by_label("This week").get_by_role("link", name="Open").is_visible()
    assert plan.get_by_text("4.7 years", exact=True).is_visible()
    plan.get_by_text("Assumptions").click()
    assert plan.get_by_text("is not diagnosis or treatment", exact=False).is_visible()
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{out}/action-supported.png")
    for w, h in ((1280, 720), (1440, 900)):
        page.set_viewport_size({"width": w, "height": h})
        box = plan.bounding_box()
        # Cabe junto a la constelación; el panel de diagnóstico (HACK-018) se oculta en step=action.
        assert box["height"] <= h * 0.63, f"panel demasiado alto a {w}x{h}: {box}"
        assert box["y"] + box["height"] <= h, f"panel fuera de pantalla a {w}x{h}: {box}"
        assert plan.get_by_label("This week").is_visible() and plan.get_by_text("4.7 years", exact=True).is_visible()
        page.screenshot(path=f"{out}/action-{w}.png")
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(f"{base}/?select=OMIM:310200&step=action")
    page.get_by_role("heading", name="No supported route yet").wait_for(timeout=10000)
    for text in ("What we searched", "Missing evidence", "This week"):
        assert page.get_by_label("Action plan").get_by_text(text).first.is_visible(), text
    page.screenshot(path=f"{out}/action-unsupported.png")
    page.goto(f"{base}/?select=ORPHA:34515")
    assert page.get_by_label("Action plan").count() == 0, "acción visible fuera de step=action"
real = [e for e in errors if "404" not in e and "405" not in e]
assert not real, real
print("ACTION_PASS: community, assets, this week, timeline + assumptions, unsupported state, hidden outside step")
