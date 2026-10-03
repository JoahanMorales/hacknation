---
name: hack-frontend
description: Frontend del hackatón (web/, Vite + React + TypeScript + Tailwind v4 + Motion). Úsala al crear o cambiar cualquier pantalla, componente o estilo en web/, al decidir el diseño visual o al verificar la UI en navegador.
---

# Frontend del hackatón

Estructura, comandos y qué skill usar en cada caso. El setup inicial está en `docs/STACK.md` (sección Frontend).

## Estructura (paralelizable)

```text
web/
  DESIGN.md                 # dirección de diseño ÚNICA del proyecto; dueño: tarea de setup/diseño
  src/App.tsx               # autodescubre features; nadie lo edita tras el setup
  src/index.css             # tokens Tailwind (@theme): fuente, color, radios; dueño: setup/diseño
  src/lib/api.ts            # api<T>("/ruta") → fetch("/api/ruta"); dueño: setup
  src/features/<f>/index.tsx  # una carpeta por tarea: `export default` + `export const order = N`
  src/features/<f>/*.tsx      # componentes de esa feature
```

Reserva por tarea `web/src/features/<f>/` (y su backend `app/routers/<f>.py, app/services/<f>.py, app/tests/test_<f>.py`). `package.json`, `package-lock.json`, `vite.config.ts`, `index.css`, `App.tsx`, `lib/` y `DESIGN.md` tienen dueño en OWNERS.md: pide cambios con `hack msg --kind request`.

## Qué skill usar

| Situación | Skill / fuente | Coste |
|---|---|---|
| Definir la dirección visual (una vez, tarea de diseño) | `design-taste-frontend` completa → escribe `web/DESIGN.md` | Alto (~25k tokens), una sola vez |
| Pantalla de impacto: landing, hero, pantalla del momento wow | `design-taste-frontend` (secciones 4, 9 y Pre-Flight 14) | Alto; sólo en esas pantallas |
| Pantallas de producto (formularios, listas, paneles) | `web/DESIGN.md` + estados loading/empty/error + contraste AA | Bajo |
| Rendimiento o patrones React | `vercel-react-best-practices`: lee sólo `rules/<regla>.md` relevante | Bajo |
| Verificar que la UI funciona | `webapp-testing` con `with_server.py` | Bajo si sólo imprimes el veredicto |
| Pulido durante freeze | `redesign-existing-projects` (Fix Priority 1-6) | Medio |

`design-taste-frontend` asume Next.js; aquí: sin RSC ni `next/font` (fuentes con `@fontsource`, ya instaladas), `"use client"` no aplica, Motion desde `motion/react`, iconos `@phosphor-icons/react`. La propia skill excluye dashboards y tablas: ahí aplica sólo sus reglas generales (tokens, estados, contraste, sin AI tells).

## DESIGN.md (contrato visual compartido)

Lo crea la tarea de diseño con la sección 0.B y 1 de `design-taste-frontend`: Design Read de una línea, diales VARIANCE/MOTION/DENSITY, un acento, tema (light/dark/auto), fuente, escala de radios, librería de iconos, y 5-10 reglas concretas. Todos los agentes lo leen antes de tocar UI y no lo contradicen; un cambio se pide al dueño. Por qué: cuatro agentes que infieren su propio estilo producen cuatro sitios distintos.

## Comandos

```bash
npm --prefix web run dev          # Vite en :5173 con proxy /api → :8000 (arranca también uvicorn)
bash scripts/q npm --prefix web run lint
bash scripts/q npm --prefix web run build   # FastAPI sirve web/dist en / (demo = un solo proceso)
```

Verificación en navegador (Playwright ya en dev-deps; Chromium: `uv run playwright install chromium` una vez por máquina):

```bash
bash scripts/q npm --prefix web run build
bash scripts/q uv run python .claude/skills/webapp-testing/scripts/with_server.py \
  --server "uv run uvicorn app.main:app --port 8000" --port 8000 -- uv run python /tmp/check_<f>.py
```

El script de Playwright imprime una línea de veredicto, guarda capturas en `/tmp/`, y falla (`assert`) si falta el elemento o hay errores de consola. Nunca pegues el DOM completo al contexto.

## Reglas

- Llama al backend sólo con `api<T>()`; rutas bajo `/api`. Mientras el endpoint no exista, usa un mock etiquetado (`demo_data: true`) con la forma del contrato.
- Cada vista con datos tiene loading (skeleton), empty y error.
- Sin guiones largos (—) en texto visible; sin "Lorem ipsum", "John Doe" ni "Acme" (AI tells).
- `prefers-reduced-motion` respetado en toda animación.
