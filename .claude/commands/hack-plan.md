---
model: opus
description: Rol planificador — IDEA + rubric → TASKS.md, OWNERS.md y contratos para la primera ola
---

Eres el planificador. Lee IDEA.md, HACKATHON.md y la sección de planificación de docs/PLAYBOOK.md; para el stack, docs/STACK.md.

Produce, en el checkout principal (`main`), en UNA tanda:

1. **TASKS.md** (formato de TASKS.template.md, sin campo Estado):
   - HACK-001 `setup` P0, primera en arrancar: backend + frontend de docs/STACK.md + `init-smoke`; mete TODAS las dependencias previsibles (Python y npm) de una vez. Dueño de `pyproject.toml, uv.lock, app/main.py, app/config.py, web/package.json, web/package-lock.json, web/vite.config.ts, web/src/App.tsx, web/src/lib/`. Toca lockfile y `scripts/` → su merge es humano (`gh pr merge`) y luego `hack done --integrated` (ver /hack-ship paso 9).
   - HACK-002 `contract` P0: `app/schemas/` + `app/fixtures/` con los modelos y datos de demo, y `web/DESIGN.md` + tokens en `web/src/index.css` usando la skill `design-taste-frontend` (una sola dirección visual para todos). Dueño de `app/schemas/, web/DESIGN.md, web/src/index.css`.
   - Walking skeleton P0 con mocks del recorrido completo hasta el momento wow.
   - Spikes P0 de 30 min para cada riesgo externo (API, modelo, datos).
   - Features verticales P0 → P1 → P2, cada una ≤ 60 min, con Archivos probables DISJUNTOS (`app/routers/<f>.py, app/services/<f>.py, app/tests/test_<f>.py, web/src/features/<f>/`).
   - Demo P0: ensayo + video plan B (Freeze-Allowed: yes). Docs/README P0 (Freeze-Allowed: yes).
   - Cada tarea: Rubric, Relacionadas (tareas que comparten contrato/endpoint/datos: productor ↔ consumidor, API ↔ UI; así los avisos llegan solos), Depende de (sólo dependencias reales; consumidores usan contratos/mocks, no esperan a HACK-001 salvo para correr la app), Cómo verificar exacto (`uv run pytest -q app/tests/test_<f>.py`).
   - Objetivo: ≥ 4 tareas sin dependencias en la primera ola, una por humano/agente.
2. **OWNERS.md**: copia las filas de OWNERS.template.md (Python y web) y añade .github/workflows/ si hay CI (sólo IDs que existan en TASKS).
3. `bash scripts/hack lint` → LINT_OK.
4. Muestra al humano: tabla ID · título · P · rubric · deps (≤ 1 pantalla). Pide aprobación; al recibirla fija `Backlog-Approved: yes` en HACKATHON.md.
5. Commit `plan: backlog v1` y push a `main` (es el único push directo a main permitido, hecho por el planificador con aprobación humana).
