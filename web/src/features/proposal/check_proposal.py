"""Verifica 'Draft a proposal' (HACK-026) en Chromium.

Uso, con la web compilada y FastAPI arriba (DEMO_MODE=true usa la propuesta grabada):
  uv run python web/src/features/proposal/check_proposal.py http://127.0.0.1:8000 /tmp
"""

import sys

from playwright.sync_api import sync_playwright

base, out = sys.argv[1], sys.argv[2]
errors = []
with sync_playwright() as p:
    context = p.chromium.launch().new_context(viewport={"width": 1440, "height": 900},
                                              permissions=["clipboard-read", "clipboard-write"])
    page = context.new_page()
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.goto(f"{base}/?select=ORPHA:34515&step=action")
    page.get_by_role("button", name="Draft a proposal").click(timeout=15000)
    dialog = page.get_by_role("dialog", name="Collaboration proposal")
    dialog.get_by_role("heading", name="Questions for expert review").wait_for(timeout=40000)
    assert "×" in dialog.get_by_role("heading").first.inner_text(), "título con ambas enfermedades"
    assert dialog.get_by_role("link", name="Source 1:", exact=False).count() >= 1, "citas numeradas"
    assert dialog.locator("ol li a[href^='http']").count() >= 3, "fuentes enlazadas"
    page.screenshot(path=f"{out}/proposal.png")
    dialog.get_by_role("button", name="Copy with sources").click()
    copied = page.evaluate("navigator.clipboard.readText()")
    assert "## Sources" in copied and "http" in copied, "copia con fuentes"
    page.keyboard.press("Escape")
    assert page.get_by_role("dialog").count() == 0, "Esc cierra"
real = [e for e in errors if "404" not in e and "405" not in e]
assert not real, real
print("PROPOSAL_PASS: draft from action, numbered citations, linked sources, expert questions, copy, Esc")
