"""Verifica la legibilidad del Pathway (HACK-031) en Chromium.

Uso, con la web compilada y FastAPI arriba:
  uv run python web/src/features/pathway/check_pathway.py http://127.0.0.1:8000 [captura.png]
"""

import sys

from playwright.sync_api import sync_playwright

base = sys.argv[1]
shot = sys.argv[2] if len(sys.argv) > 2 else None
errors = []
with sync_playwright() as p:
    page = p.chromium.launch().new_page(viewport={"width": 1280, "height": 720})
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{base.rstrip('/')}/?view=atlas")  # la landing (HACK-029) va antes del atlas
    page.get_by_role("button", name="Play sample case").click()
    page.get_by_role("button", name="Inspect Pompe disease, late-onset").click(timeout=30000)
    page.get_by_role("button", name="Open pathway", exact=False).click(timeout=10000)
    nav = page.get_by_label("Pathway navigator")
    nav.wait_for(timeout=10000)
    assert page.get_by_label("Disease inspector").count() == 0, "el inspector sigue montado debajo del pathway"

    # Recentrar en LGMD R9, donde aparecen las seis "Muscular dystrophy-dystroglycanopathy".
    nav.locator("g", has=page.locator("title", has_text="Disease: FKRP-related limb-girdle")).last.dispatch_event("dblclick")
    page.get_by_role("heading", name="FKRP-related limb-girdle muscular dystrophy R9").wait_for(timeout=10000)
    page.wait_for_timeout(900)  # animación de entrada
    texts = nav.locator("svg text").all_text_contents()
    for expected in ("FKTN · LGMD C4", "POMT1 · LGMD C1", "POMGNT1 · LGMD C3", "CRPPA · LGMD C7"):
        assert expected in texts, f"falta {expected!r} en {texts}"
    mddg = [t for t in texts if "dystroglycanopathy" in t.lower()]
    assert not mddg, f"nombres largos indistinguibles: {mddg}"

    # Etiquetas de arista: ninguna se solapa con otra ni con el nombre del centro.
    overlaps = page.evaluate("""() => {
      const svg = document.querySelector('[aria-label="Pathway navigator"] svg[role="img"]');
      const labels = [...svg.querySelectorAll('g[pointer-events="none"] rect')].map(r => r.getBoundingClientRect());
      const center = [...svg.querySelectorAll('text')].find(t => t.classList.contains('font-medium')).getBoundingClientRect();
      const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      let n = 0;
      labels.forEach((a, i) => { if (hit(a, center)) n++; labels.slice(i + 1).forEach(b => { if (hit(a, b)) n++; }); });
      return n;
    }""")
    assert overlaps == 0, f"{overlaps} etiquetas solapadas"
    # Nombres de nodo: los del anillo interior (genes y mecanismos) no deben pisarse entre sí (nota de joahan-1).
    node_overlaps = page.evaluate("""() => {
      const svg = document.querySelector('[aria-label="Pathway navigator"] svg[role="img"]');
      const boxes = [...svg.querySelectorAll('g[style] > text, g[transform] > text')]
        .filter(t => !t.closest('g[pointer-events="none"]')).map(t => t.getBoundingClientRect()).filter(b => b.width > 0);
      const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
      let n = 0;
      boxes.forEach((a, i) => boxes.slice(i + 1).forEach(b => { if (hit(a, b)) n++; }));
      return n;
    }""")
    assert node_overlaps == 0, f"{node_overlaps} nombres de nodo solapados"
    edge_names = [e.get_attribute("aria-label") for e in nav.locator('svg g[role="button"]').all()]
    assert any(n.startswith("Shared phenotype:") for n in edge_names), "phenotype_similarity sin rotular"

    # Teclado: Tab llega a una arista y Enter abre su tarjeta.
    first = nav.locator('svg g[role="button"]').first
    first.focus()
    page.keyboard.press("Enter")
    nav.get_by_text("Connection", exact=True).wait_for(timeout=5000)
    if shot:
        page.screenshot(path=shot)
assert not errors, errors
print(f"PATHWAY_PASS: nombres cortos con gen, 0 etiquetas ni nombres solapados, {len(edge_names)} aristas enfocables, sin inspector debajo")
