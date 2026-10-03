---
description: Cierre — freeze, ensayo limpio, plan B y checklist de submission
---

Rol demo. Lee la sección Cierre de docs/PLAYBOOK.md y "Plan B y entrega" de HACKATHON.md.

1. `bash scripts/hack digest`: lista REVIEW/BLOCKED pendientes; propone al humano qué integrar y qué cortar (P0 primero).
2. Checkout limpio: `git clone <origin> /tmp/hack-clean && cd /tmp/hack-clean && uv sync && bash scripts/smoke` → registra salida.
3. Arranca la app (`uv run uvicorn app.main:app --port 8000`) y recorre el flujo de demo de HACKATHON.md hasta el wow; cronometra. Anota cada fallo como tarea P0 con Freeze-Allowed: yes.
4. Prepara guion de 3 min: problema (20 s) → demo en vivo hasta el wow (≤ 90 s) → cómo funciona (40 s) → impacto/siguiente (30 s). Mapea cada parte a un criterio del rubric.
5. Recuérdale al humano grabar el video plan B (no lo puedes grabar tú) y dónde guardarlo.
6. Recorre la checklist de HACKATHON.md marcando con evidencia; README del producto con instalación (`uv sync`), ejecución y variables de `.env.example`.
7. La submission la envía la persona autorizada; tú sólo preparas enlaces y textos.
