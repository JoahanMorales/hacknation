"""Verifica la navegación evidencia -> acción -> evidencia sin recargar ni editar la URL (pedido de zoe-1).

Uso, con la web compilada y FastAPI arriba:
  uv run python web/src/features/action/check_nav.py http://127.0.0.1:8000
"""

import sys

from playwright.sync_api import sync_playwright

base = sys.argv[1]
with sync_playwright() as p:
    page = p.chromium.launch().new_page(viewport={"width": 1280, "height": 720})
    posts = []
    page.on("request", lambda r: r.method == "POST" and r.url.endswith("/api/action-plan") and posts.append(r.url))
    page.goto(base)
    page.get_by_role("button", name="Load published sample").click()
    for disease, curated in (("Pompe disease, late-onset", True), ("Myoglobinuria, acute recurrent, autosomal recessive", False)):
        page.get_by_role("button", name=f"Inspect {disease}").click(timeout=30000)
        page.get_by_role("button", name="Next steps", exact=False).click(timeout=10000)
        heading = "Who is already working on this" if curated else "No supported route yet"
        page.get_by_label("Action plan").get_by_role("heading", name=heading).wait_for(timeout=10000)
        assert page.get_by_label("Phenotype matching").count() == 0, "diagnosis visible en action"
        page.get_by_role("button", name="Back to evidence").click()
        page.get_by_label("Disease inspector").wait_for(timeout=10000)
        page.get_by_label("Phenotype matching").wait_for(timeout=10000)
        assert page.get_by_role("button", name=f"Inspect {disease}").count() == 1, "hallazgos o ranking perdidos"
    assert page.url.rstrip("/") == base.rstrip("/"), f"la URL cambio: {page.url}"
    assert len(posts) >= 2, posts
print("NAV_PASS: inspect -> next steps (POST /api/action-plan) -> back to evidence, curado y sin ruta, sin recargar")
