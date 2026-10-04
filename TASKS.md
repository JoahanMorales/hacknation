# TASKS · Constelación (backlog estático v1)

Fuente: IDEA.md §12 y docs/FRONTEND-BRIEF.md. Sin campo Estado: el estado vive en la rama claims (`bash scripts/hack status`). Rubric: GQ = Graph quality · EI = Evidence integrity · PP = Patient progress · X10 = 10× impact · CRAFT = Ambition and product craft.

## Corte y primera ola

- **Prioridad del equipo: el frontend.** Toda pantalla del recorrido debe verse y funcionar de punta a punta con el caso de ejemplo aunque una API aún no exista. Las tareas de UI (dueño natural: Saus, 2 agentes) no dependen de las de API: consumen los ejemplos del contrato `app/fixtures/api/` (HACK-002) a través de `web/src/lib/api.ts`, que usa el ejemplo cuando el endpoint no responde.
- Línea de corte: P0. P1 sólo con el recorrido P0 integrado. P2 sólo si sobra tiempo.
- Ruta crítica de la demo: HACK-001 → HACK-005 (diseño) → HACK-006 (constelación) + HACK-017 (dictado) + HACK-018 (diagnóstico) → HACK-019 (inspector) → HACK-020 (acción Maria) → HACK-014 (demo).
- Primera ola sin dependencias: HACK-001 setup (Joahan) · HACK-005 diseño (Saus) · HACK-002 contrato (Zoe) · HACK-004 spike OpenAI (Cris) · HACK-003 datos (Zoe o Cris, 2.º agente) · HACK-009 capa profunda.
- Segunda ola (tras HACK-001 integrada): UI 006, 017, 018, 019, 020 · API 007, 008, 010, 011 · 015.
- Estado compartido de la UI: `web/src/lib/store.ts` (HACK-001). Componentes base compartidos: `web/src/ui/` (HACK-005). Las features no se importan entre sí.
- Freeze: ver HACKATHON.md (Freeze-Epoch). Durante el freeze sólo HACK-014 y HACK-015.

## HACK-001 · Esqueleto FastAPI + React corriendo con smoke de producto

- **Tipo:** setup
- **Prioridad:** P0
- **Estimación:** 25 min
- **Área:** backend, frontend, infraestructura
- **Objetivo:** cualquier agente puede correr la app (FastAPI sirve la web) y `bash scripts/smoke` da PRODUCT_PASS.
- **Rubric:** CRAFT
- **Depende de:** Ninguna
- **Relacionadas:** HACK-002, HACK-005, HACK-006, HACK-017
- **Archivos probables:** pyproject.toml, uv.lock, .python-version, app/__init__.py, app/main.py, app/config.py, app/routers/__init__.py, app/services/__init__.py, app/tests/test_health.py, web/package.json, web/package-lock.json, web/vite.config.ts, web/index.html, web/src/App.tsx, web/src/main.tsx, web/src/index.css, web/src/lib/, scripts/smoke-project, scripts/.smoke-project.provenance
- **Contratos consumidos:** docs/STACK.md, docs/FRONTEND-BRIEF.md (sección Arquitectura de pantalla)
- **Criterios de aceptación:**
  - Setup de docs/STACK.md salvo `app/schemas/__init__.py` (lo crea HACK-002), más estas dependencias de una vez: Python `openai`; npm `sigma graphology graphology-types @react-sigma/core @mediapipe/tasks-vision zustand`.
  - `web/src/index.css` importa `./theme.css` y existe `web/src/theme.css` mínimo (Geist); HACK-005 lo amplía.
  - `web/src/App.tsx`: layout de pantalla completa de docs/FRONTEND-BRIEF.md (lienzo de grafo de fondo + capas para las features por `slot`: `stage`, `left`, `right`, `bottom`, `overlay`). Cada feature exporta `slot` además de `order`.
  - `web/src/lib/store.ts`: store zustand con `step`, `transcript`, `terms: {hpo_id, label, present}[]`, `ranking: {disease_id, name, pct, low, high}[]`, `nextQuestion`, `selectedId`, con sus setters.
  - `web/src/lib/api.ts`: `api<T>(path, init, example?)`; si el endpoint falla y hay `example`, lo devuelve y marca `store.sampleMode = true` (badge "Sample case" en la UI).
  - `app/config.py` lee `OPENAI_API_KEY` y `DEMO_MODE` del entorno (pydantic-settings).
  - `bash scripts/hack init-smoke --command "<comando de docs/STACK.md>"` → PRODUCT_PASS.
- **Cómo verificar:** bash scripts/smoke
- **Siguiente paso:** ejecutar el Setup backend de docs/STACK.md en este worktree.
- **Riesgos o decisiones pendientes:** toca lockfiles y scripts/: el merge lo hace un humano en GitHub y después `hack done --integrated` (/hack-ship paso 9). Hacerlo en < 25 min: todos esperan esta tarea.

## HACK-002 · Contrato de datos, ejemplos de cada API y caso con diagnóstico conocido

- **Tipo:** contract
- **Prioridad:** P0
- **Estimación:** 45 min
- **Área:** backend, datos
- **Objetivo:** modelos Pydantic compartidos, un ejemplo JSON por endpoint que la UI usa desde el minuto 1, y el caso de Pompe tardío listo para dictar.
- **Rubric:** GQ, EI
- **Depende de:** Ninguna
- **Relacionadas:** HACK-006, HACK-007, HACK-008, HACK-009, HACK-010, HACK-011, HACK-017, HACK-018, HACK-019, HACK-020
- **Archivos probables:** app/schemas/, app/fixtures/case/, app/fixtures/api/, app/tests/test_schemas.py
- **Contratos consumidos:** IDEA.md §6, docs/FRONTEND-BRIEF.md
- **Criterios de aceptación:**
  - `app/schemas/`: Disease, Phenotype, Edge (evidence_level ∈ observado/inferido/hipotesis/contradictorio, source_url, retrieved_at), PatientGroup, Asset, Case, DiagnosisResult, NextQuestion y ActionPlan.
  - `app/fixtures/case/pompe_case.json`: caso de la cohorte GAA de phenopacket-store (afectación respiratoria + CK alta) con PMID, términos HPO presentes y negados, `transcript_es` y `transcript_en` (≤ 60 s), y la secuencia de términos en el orden del dictado.
  - `app/fixtures/api/`: un ejemplo realista por endpoint (graph_overview con ~300 nodos, symptoms_extract, diagnose por cada paso del dictado, next_question, node, edge, explain, action_plan) que valida contra el esquema. El ranking de los ejemplos sale de ejecutar el LR de IDEA.md §5 sobre phenotype.hpoa (script `app/fixtures/api/generate.py`), no escrito a mano.
  - Test que valida todos los ejemplos contra los esquemas.
- **Cómo verificar:** uv run pytest -q app/tests/test_schemas.py
- **Siguiente paso:** publicar primero los esquemas y ejemplos de graph_overview y diagnose (los que Saus necesita antes), luego el resto.
- **Riesgos o decisiones pendientes:** hasta que HACK-001 esté integrada, el test corre con `uv run --with pydantic --with pytest pytest`. Al publicar: `hack msg related:HACK-002 --kind contract "..."`.

## HACK-003 · Pipeline de datos HPO → grafo con posiciones precalculadas + endpoint overview

- **Tipo:** spike
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** datos, backend
- **Objetivo:** JSON reproducible con ~12,867 enfermedades (x, y, grupo) y anotaciones propagadas por la jerarquía HPO, servido en `GET /api/graph/overview`.
- **Rubric:** GQ
- **Depende de:** Ninguna
- **Relacionadas:** HACK-006, HACK-007, HACK-012
- **Archivos probables:** data/fetch.sh, data/build.py, data/README.md, app/fixtures/graph/, app/routers/graph.py, app/tests/test_graph.py
- **Contratos consumidos:** IDEA.md §5 y §6, app/schemas/ (HACK-002)
- **Criterios de aceptación:**
  - `data/fetch.sh` descarga hp.json y phenotype.hpoa v2026-09-01 (GitHub releases) a `data/raw/` (ignorado por Git).
  - `data/build.py` genera `app/fixtures/graph/overview.json` (< 3 MB) y `annotations.json` (frecuencias por enfermedad, ancestros, frecuencia de fondo; distingue frecuencia conocida de desconocida).
  - Layout legible para la "constelación": grupos por sistema HPO raíz como galaxias separadas (ver docs/FRONTEND-BRIEF.md).
  - `--check` valida sin reescribir: ≥ 12,000 enfermedades, y OMIM:621314 y ORPHA:34515 presentes.
- **Cómo verificar:** python3 data/build.py --check
- **Siguiente paso:** `bash data/fetch.sh` y luego parsear phenotype.hpoa (aspect = P, qualifier ≠ NOT).
- **Riesgos o decisiones pendientes:** nunca calcular el layout en el navegador.

## HACK-004 · Spike OpenAI: dictado en vivo y extracción de síntomas a HPO

- **Tipo:** spike
- **Prioridad:** P0
- **Estimación:** 30 min, límite estricto
- **Área:** ia, backend
- **Objetivo:** confirmar los modelos reales (transcripción en vivo ES/EN y extracción estructurada con negación) y grabar las respuestas reales del caso para el modo demo.
- **Rubric:** EI, CRAFT
- **Depende de:** Ninguna
- **Relacionadas:** HACK-008, HACK-010, HACK-017
- **Archivos probables:** spikes/openai/
- **Contratos consumidos:** IDEA.md §7
- **Criterios de aceptación:**
  - `spikes/openai/spike.py` transcribe con `gpt-live-transcribe` o `gpt-transcribe` (keywords del cluster) y extrae `[{hpo_id, present, quote}]` con salida estructurada, eligiendo sólo entre IDs candidatos.
  - `spikes/openai/RESULT.md`: modelos exactos, latencias y fallos.
  - `spikes/openai/recorded/*.json`: respuestas reales del caso.
- **Cómo verificar:** python3 spikes/openai/spike.py --check
- **Siguiente paso:** pedir OPENAI_API_KEY al humano (va en .env) y probar primero la extracción.
- **Riesgos o decisiones pendientes:** si un modelo no existe o no admite salida estructurada, anotar el que funcione y avisar a related:HACK-004.

## HACK-005 · Sistema visual: DESIGN.md, tokens y componentes base

- **Tipo:** contract
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** frontend, diseño
- **Objetivo:** la dirección visual de docs/FRONTEND-BRIEF.md convertida en sistema: DESIGN.md, tokens y componentes base que usan todas las pantallas.
- **Rubric:** CRAFT
- **Depende de:** Ninguna
- **Relacionadas:** HACK-006, HACK-013, HACK-017, HACK-018, HACK-019, HACK-020
- **Archivos probables:** web/DESIGN.md, web/src/theme.css, web/src/ui/
- **Contratos consumidos:** docs/FRONTEND-BRIEF.md, skill design-taste-frontend (§0.B, §1, §4, §6, §9 y Pre-Flight 14)
- **Criterios de aceptación:**
  - `web/DESIGN.md`: Design Read, diales, paleta (fondo, superficies, texto, un acento, 6 colores de mecanismo con contraste AA), tipografía, radios, sombras/brillos, curvas y duraciones de Motion, iconos Phosphor y las reglas de docs/FRONTEND-BRIEF.md.
  - `web/src/theme.css` con los tokens `@theme`.
  - `web/src/ui/`: Panel (vidrio oscuro), Chip (presente/negado), Meter (% con rango), EvidenceBadge (4 niveles, con texto + color), Button, Kbd, SampleBadge; una página `?ui=kit` que los muestra todos.
  - Build verde y kit revisado con la skill webapp-testing (captura en /tmp).
- **Cómo verificar:** test -s web/DESIGN.md && npm --prefix web run build
- **Siguiente paso:** escribir DESIGN.md con la skill design-taste-frontend; tocar theme.css y web/src/ui/ sólo después de rebasear sobre main con HACK-001 integrada.
- **Riesgos o decisiones pendientes:** al publicar: `hack msg related:HACK-005 --kind contract "DESIGN.md y web/src/ui/ publicados"`.

## HACK-006 · UI Constelación: grafo vivo que se poda con el ranking

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** frontend
- **Objetivo:** la pantalla de entrada (docs/FRONTEND-BRIEF.md, Escena 1 y la coreografía del wow): miles de estrellas por galaxia; cuando cambia `ranking`, lo que no coincide se apaga y las 2 candidatas se encienden y se acercan.
- **Rubric:** GQ, CRAFT
- **Depende de:** HACK-001
- **Relacionadas:** HACK-002, HACK-003, HACK-005, HACK-013, HACK-018, HACK-019
- **Archivos probables:** web/src/features/graph/
- **Contratos consumidos:** app/fixtures/api/graph_overview.json y diagnose_*.json (HACK-002); `GET /api/graph/overview` (HACK-003) cuando exista
- **Criterios de aceptación:**
  - sigma.js (WebGL) con posiciones fijas; ≥ 12,000 nodos fluidos con los datos reales (con el ejemplo de 300, igual de bonito).
  - Coreografía del wow de docs/FRONTEND-BRIEF.md: apagado por ola, pulso de las candidatas, cámara que encuadra el par; ≤ 900 ms por paso; prefers-reduced-motion respetado.
  - Clic en una estrella → `selectedId`; hover con nombre.
- **Cómo verificar:** npm --prefix web run build
- **Siguiente paso:** renderizar graph_overview.json con sigma y los colores de DESIGN.md; luego la animación de poda leyendo `ranking`.
- **Riesgos o decisiones pendientes:** si sigma no aguanta los 12k, bajar a 5,000 en la demo.

## HACK-007 · API scoring LR, ranking y siguiente mejor pregunta

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** backend
- **Objetivo:** con los términos del caso, Pompe tardío y LGMD R9 quedan entre las 2 primeras, con % de coincidencia, rango, drivers y la pregunta que mejor las separa.
- **Rubric:** GQ, EI
- **Depende de:** HACK-001
- **Relacionadas:** HACK-002, HACK-003, HACK-012, HACK-018
- **Archivos probables:** app/services/scoring.py, app/routers/diagnose.py, app/tests/test_scoring.py
- **Contratos consumidos:** IDEA.md §5, app/schemas/ (HACK-002), app/fixtures/graph/annotations.json (HACK-003; mientras tanto, fixture mínimo en el test)
- **Criterios de aceptación:**
  - LR por término con propagación por ancestros; no anotado → LR≈1; negados con (1−p).
  - `POST /api/diagnose` → top-10 con pct, low, high y top-3 drivers; `POST /api/next-question` → máxima ganancia de información entre las 2 primeras; respuestas con la forma exacta de app/fixtures/api/.
  - Test: con los términos del caso, OMIM:621314 en el top-2 y los drivers incluyen la afectación respiratoria.
- **Cómo verificar:** uv run pytest -q app/tests/test_scoring.py
- **Siguiente paso:** LR sobre un fixture de 5 enfermedades en el test; luego conectar annotations.json.
- **Riesgos o decisiones pendientes:** el número nunca sale del LLM.

## HACK-008 · API extracción de síntomas a HPO con negación

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 45 min
- **Área:** backend, ia
- **Objetivo:** `POST /api/symptoms/extract` convierte texto en términos HPO con presencia o negación, y emite el token efímero de transcripción para el navegador.
- **Rubric:** EI, CRAFT
- **Depende de:** HACK-001
- **Relacionadas:** HACK-002, HACK-004, HACK-017
- **Archivos probables:** app/routers/symptoms.py, app/services/symptoms.py, app/tests/test_symptoms.py
- **Contratos consumidos:** spikes/openai/RESULT.md (HACK-004), app/schemas/ (HACK-002)
- **Criterios de aceptación:**
  - Buscador local de sinónimos HPO → candidatos; OpenAI elige entre ellos; un ID desconocido se descarta.
  - `DEMO_MODE=true` o error de red → respuestas grabadas de HACK-004.
  - `POST /api/transcribe/session` → token efímero (la clave nunca va al navegador).
- **Cómo verificar:** uv run pytest -q app/tests/test_symptoms.py
- **Siguiente paso:** endpoint con DEMO_MODE primero; luego la llamada real.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-009 · Capa profunda curada con evidencia citada

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** datos
- **Objetivo:** aristas, grupos de pacientes y activos del cluster (distroglicanopatías + Pompe + diferencial LGMD), cada uno con fuente, fecha y nivel de evidencia.
- **Rubric:** EI, PP, GQ
- **Depende de:** Ninguna
- **Relacionadas:** HACK-002, HACK-010, HACK-011, HACK-019, HACK-020
- **Archivos probables:** app/fixtures/deep/, data/curate/
- **Contratos consumidos:** IDEA.md §3, §6 y §11
- **Criterios de aceptación:**
  - Enfermedades: Pompe tardío, LGMD R9 (FKRP), FKTN, CRPPA, POMT1, POMGNT1, LARGE1, CAPN3, DYSF, ANO5, con genes y mecanismo.
  - Aristas: ruta ribitol FKRP/FKTN/CRPPA (clínico en FKRP, preclínico en FKTN/CRPPA) y el contraejemplo FKRP LGMD R9 frente a distrofia congénita (serie alélica).
  - Grupos: International Pompe Association, CureLGMD2i, LGMD Awareness Foundation. Activos: NCT04001595, GRASP, Pompe Registry (NCT00231400), BBP-418 (PDUFA 27 nov 2026), vía ClinicalTrials.gov API v2 y NIH RePORTER.
  - `data/curate/check.py` valida que toda arista tenga source_url y evidence_level.
- **Cómo verificar:** python3 data/curate/check.py
- **Siguiente paso:** escribir primero las 10 aristas del puente ribitol y del contraejemplo con las URLs de IDEA.md §11.
- **Riesgos o decisiones pendientes:** nada sin fuente.

## HACK-010 · API nodo, arista y explicación para la familia

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 45 min
- **Área:** backend, ia
- **Objetivo:** `GET /api/node/{id}`, `GET /api/edge/{id}` y `POST /api/explain` (texto que cita sólo aristas existentes).
- **Rubric:** EI, GQ
- **Depende de:** HACK-001
- **Relacionadas:** HACK-002, HACK-004, HACK-009, HACK-019
- **Archivos probables:** app/routers/node.py, app/services/explain.py, app/tests/test_node.py
- **Contratos consumidos:** app/schemas/ (HACK-002), app/fixtures/deep/ (HACK-009)
- **Criterios de aceptación:**
  - Nodo y arista desde la capa profunda; 404 claro fuera del cluster.
  - Explain con `[edge_id]`; el backend elimina citas a IDs inexistentes; DEMO_MODE usa la respuesta grabada.
- **Cómo verificar:** uv run pytest -q app/tests/test_node.py
- **Siguiente paso:** endpoints sobre un fixture de 3 aristas.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-011 · API plan de acción para Maria y línea de tiempo 10×

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 45 min
- **Área:** backend
- **Objetivo:** `POST /api/action-plan` {disease_id} → groups, assets, bridges, differences, needs_expert, this_week, timeline{current, proposed, assumptions[]}; o "sin ruta soportada" con lo que se buscó y lo que falta.
- **Rubric:** PP, X10
- **Depende de:** HACK-001
- **Relacionadas:** HACK-002, HACK-009, HACK-020
- **Archivos probables:** app/routers/action.py, app/services/action.py, app/tests/test_action.py
- **Contratos consumidos:** app/fixtures/deep/ (HACK-009), IDEA.md §8 y §11
- **Criterios de aceptación:**
  - Respuesta con la forma de app/fixtures/api/action_plan.json; la línea de tiempo cita 4.7 años (EURORDIS) y lista los supuestos.
  - Nunca recomienda tratamientos: el paso siempre es contactar, preguntar o probar.
- **Cómo verificar:** uv run pytest -q app/tests/test_action.py
- **Siguiente paso:** endpoint con el fixture LGMD R9.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-012 · Validación retrospectiva sobre phenopacket-store

- **Tipo:** feature
- **Prioridad:** P1
- **Estimación:** 45 min
- **Área:** datos, backend
- **Objetivo:** top-1 y top-3 del scoring sobre casos publicados (los 10 GAA + una muestra de 200), mostrados en la UI y el README, y el umbral de "sin ruta soportada".
- **Rubric:** EI, GQ
- **Depende de:** HACK-007
- **Relacionadas:** HACK-003, HACK-015, HACK-018
- **Archivos probables:** data/validate.py, app/fixtures/validation/, docs/validation.md
- **Contratos consumidos:** app/services/scoring.py
- **Criterios de aceptación:**
  - `docs/validation.md` con n, top-1, top-3 y método (validación retrospectiva sobre casos publicados).
  - `--check` lee el resultado guardado sin recalcular.
- **Cómo verificar:** python3 data/validate.py --check
- **Siguiente paso:** descargar `all_phenopackets.zip` (release 0.1.27) a data/raw/.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-013 · UI gestos con MediaPipe

- **Tipo:** feature
- **Prioridad:** P1
- **Estimación:** 45 min
- **Área:** frontend
- **Objetivo:** Open_Palm = atrás, Pointing_Up = abrir estrella, Victory = siguiente pregunta, Closed_Fist = pausa, pellizco = zoom; con un HUD de mano elegante (docs/FRONTEND-BRIEF.md).
- **Rubric:** CRAFT
- **Depende de:** HACK-006
- **Relacionadas:** HACK-005, HACK-006, HACK-018
- **Archivos probables:** web/src/features/gestures/
- **Contratos consumidos:** web/src/lib/store.ts
- **Criterios de aceptación:**
  - Interruptor "gestos"; el ratón sigue funcionando; debounce de 600 ms; indicador del gesto detectado.
- **Cómo verificar:** npm --prefix web run build
- **Siguiente paso:** GestureRecognizer de @mediapipe/tasks-vision con el modelo integrado.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-014 · Demo: ensayo, walkthrough de 1 min y video de respaldo

- **Tipo:** demo
- **Prioridad:** P0
- **Estimación:** 45 min
- **Área:** demo, documentación
- **Objetivo:** guion de 3 min y walkthrough de 1 min (Dra. Ruiz → Maria) ensayados; video de respaldo grabado y reproducido.
- **Rubric:** CRAFT, PP, X10
- **Depende de:** HACK-006, HACK-017, HACK-018, HACK-020
- **Relacionadas:** HACK-015, HACK-020
- **Archivos probables:** docs/demo/
- **Contratos consumidos:** IDEA.md §4, §8 y §11, docs/FRONTEND-BRIEF.md
- **Criterios de aceptación:**
  - `docs/demo/script.md` con tiempos por paso y criterio del rubric; cada cifra con su fuente.
  - Recorrido verificado con la skill webapp-testing y luego a mano, cronometrado.
- **Cómo verificar:** test -s docs/demo/script.md
- **Siguiente paso:** /hack-demo.
- **Riesgos o decisiones pendientes:** Ninguno
- **Freeze-Allowed:** yes

## HACK-015 · README del producto: arquitectura y reproducción del dataset

- **Tipo:** docs
- **Prioridad:** P0
- **Estimación:** 30 min
- **Área:** documentación
- **Objetivo:** el jurado entiende, instala y reproduce el dataset desde el README.
- **Rubric:** EI, CRAFT
- **Depende de:** HACK-001
- **Relacionadas:** HACK-003, HACK-012, HACK-014
- **Archivos probables:** README.md, docs/ARCHITECTURE.md, docs/AGENT-TOOLKIT.md
- **Contratos consumidos:** IDEA.md
- **Criterios de aceptación:**
  - README.md del producto: qué es, capturas, cómo correr, reproducir el dataset (data/fetch.sh y data/build.py), uso de OpenAI, ética, fuentes y licencias. El README del toolkit de agentes se mueve a docs/AGENT-TOOLKIT.md.
  - docs/ARCHITECTURE.md con el flujo voz → HPO → LR → grafo → acción.
- **Cómo verificar:** grep -q "data/build.py" README.md && test -s docs/ARCHITECTURE.md
- **Siguiente paso:** mover el README actual y escribir el del producto.
- **Riesgos o decisiones pendientes:** Ninguno
- **Freeze-Allowed:** yes

## HACK-016 · Modo edge en Jetson Orin Nano Super

- **Tipo:** spike
- **Prioridad:** P2
- **Estimación:** 45 min
- **Área:** infraestructura, ia
- **Objetivo:** la app (scoring local + web) corre en la Jetson; se documenta qué funciona sin conexión.
- **Rubric:** CRAFT
- **Depende de:** Ninguna
- **Relacionadas:** HACK-004
- **Archivos probables:** spikes/edge/
- **Contratos consumidos:** docs/STACK.md
- **Criterios de aceptación:**
  - `spikes/edge/RESULT.md`: JetPack, qué corre, latencias.
- **Cómo verificar:** test -s spikes/edge/RESULT.md
- **Siguiente paso:** comprobar uv y node en la Jetson y correr el backend con el fixture del caso.
- **Riesgos o decisiones pendientes:** P2: la demo corre en laptop.

## HACK-017 · UI dictado: voz en vivo y chips de síntomas

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** frontend
- **Objetivo:** Escena 2 de docs/FRONTEND-BRIEF.md: barra de dictado, transcripción en vivo, cada síntoma vuela a la constelación como chip (negados, tachados) y actualiza `terms`.
- **Rubric:** CRAFT, EI
- **Depende de:** HACK-001
- **Relacionadas:** HACK-002, HACK-004, HACK-005, HACK-008, HACK-018
- **Archivos probables:** web/src/features/dictation/
- **Contratos consumidos:** app/fixtures/case/ y app/fixtures/api/symptoms_extract.json (HACK-002); `POST /api/symptoms/extract` y `/api/transcribe/session` (HACK-008)
- **Criterios de aceptación:**
  - Micrófono con onda de audio; transcripción incremental; botón "Reproducir caso de ejemplo" que teclea el caso con ritmo natural (plan B sin micrófono).
  - Chips con quitar y negar; animación de vuelo hacia el grafo.
- **Cómo verificar:** npm --prefix web run build
- **Siguiente paso:** "Reproducir caso de ejemplo" con el fixture del caso; después el micrófono real.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-018 · UI diagnóstico: candidatas, % con rango y siguiente pregunta

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** frontend
- **Objetivo:** Escena 3 de docs/FRONTEND-BRIEF.md: las 2 candidatas con medidor de coincidencia y rango, drivers, y la tarjeta "siguiente mejor pregunta" con sí/no que reordena todo en vivo.
- **Rubric:** GQ, EI, CRAFT
- **Depende de:** HACK-001
- **Relacionadas:** HACK-002, HACK-006, HACK-007, HACK-012, HACK-017
- **Archivos probables:** web/src/features/diagnosis/
- **Contratos consumidos:** app/fixtures/api/diagnose_*.json y next_question.json (HACK-002); `POST /api/diagnose` y `/api/next-question` (HACK-007)
- **Criterios de aceptación:**
  - Medidores animados (número que cuenta); rango visible; aviso fijo "Phenotype match · not a diagnosis".
  - Responder la pregunta cambia `terms` → nuevo ranking → la constelación reacciona.
- **Cómo verificar:** npm --prefix web run build
- **Siguiente paso:** panel con diagnose del último paso del fixture; luego leer `terms` del store.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-019 · UI inspector: estrella y arista con evidencia

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 50 min
- **Área:** frontend
- **Objetivo:** Escena 4 de docs/FRONTEND-BRIEF.md: panel con genes, mecanismo, síntomas a favor y en contra, y por arista fuente, fecha, confianza y nivel; botón "Explain for the family".
- **Rubric:** EI, GQ, PP
- **Depende de:** HACK-001
- **Relacionadas:** HACK-002, HACK-006, HACK-009, HACK-010
- **Archivos probables:** web/src/features/inspector/
- **Contratos consumidos:** app/fixtures/api/node.json, edge.json y explain.json (HACK-002); endpoints de HACK-010
- **Criterios de aceptación:**
  - Se abre con `selectedId`; progressive reveal (resumen → detalle); EvidenceBadge con texto + color; citas clicables.
- **Cómo verificar:** npm --prefix web run build
- **Siguiente paso:** panel con node.json del fixture.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-020 · UI acción para Maria: comunidad, activos y línea de tiempo 10×

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** frontend
- **Objetivo:** Escena 5 de docs/FRONTEND-BRIEF.md: la constelación se reorganiza alrededor del mecanismo compartido; grupos, registros, puentes y el paso de esta semana; línea de tiempo actual frente a la propuesta.
- **Rubric:** PP, X10, CRAFT
- **Depende de:** HACK-001
- **Relacionadas:** HACK-002, HACK-009, HACK-011, HACK-014
- **Archivos probables:** web/src/features/action/
- **Contratos consumidos:** app/fixtures/api/action_plan.json (HACK-002); `POST /api/action-plan` (HACK-011)
- **Criterios de aceptación:**
  - Línea de tiempo animada con supuestos desplegables; tarjeta "This week" con una sola acción clara; estado "sin ruta soportada" diseñado, no vacío.
- **Cómo verificar:** npm --prefix web run build
- **Siguiente paso:** vista con action_plan.json del fixture.
- **Riesgos o decisiones pendientes:** Ninguno

# Ola 3 · Atlas definitivo (3 oct 20:00 → 4 oct 00:00, CST)

Autorizada por Joahan (humano responsable) tras revisar la app contra el brief del reto 05. Objetivo: que el jurado vea el recorrido de "What good looks like": **Maria escribe su enfermedad en una sola caja de búsqueda → vía alterada → otro gen → enfermedad relacionada → el grupo que trabaja en ella → activo reutilizable → propuesta con fuentes**, y si no hay ruta, un vacío honesto con la siguiente pregunta.

- **Huecos frente al brief que cubre esta ola:** búsqueda global con sinónimos (021/022); grafo con varios tipos de nodo y aristas que se explican solas (023/024); clustering defendible por fenotipo (025); conexión entre comunidades e investigadores, y OpenAI extrayendo aristas de la literatura (027); propuesta de colaboración con fuentes (026); experiencia pulida con el criterio del humano de Saus (028).
- **Reglas de la ola:** cada endpoint nuevo define sus modelos Pydantic en su propio router (no se edita `app/schemas/`); cada dato con fuente o etiquetado; DEMO_MODE y fallos de red devuelven respuestas grabadas o curadas; `bash scripts/smoke` y los checks de Chromium existentes deben seguir verdes. A las 00:00 se para la ola y se integra lo verde; lo que no esté verde no entra.
- **Seguridad:** el estado demostrable previo queda en la etiqueta `demo-safe-ola2` (ee957e9).

## HACK-021 · API búsqueda global con sinónimos

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 45 min
- **Área:** backend
- **Dueño sugerido:** joahan-1
- **Objetivo:** una sola búsqueda abre el grafo desde enfermedad, gen, síntoma, mecanismo, grupo de pacientes o activo, resolviendo sinónimos.
- **Rubric:** GQ, CRAFT
- **Depende de:** Ninguna
- **Relacionadas:** HACK-022, HACK-023
- **Archivos probables:** app/routers/search.py, app/services/search.py, app/tests/test_search.py
- **Contratos consumidos:** app/fixtures/graph/ (nombres, etiquetas y sinónimos HPO), app/fixtures/deep/deep.json
- **Criterios de aceptación:**
  - `GET /api/search?q=&limit=` → `{query, results:[{type: disease|gene|symptom|mechanism|group|asset, id, label, matched, disease_ids[], score}]}`; `matched` dice qué sinónimo coincidió.
  - "LGMD2I", "FKRP", "ribitol", "Pompe", "CureLGMD2i", "elevated CK" y "creatina quinasa" devuelven el resultado esperado arriba; < 150 ms en caliente.
- **Cómo verificar:** uv run pytest -q app/tests/test_search.py
- **Siguiente paso:** índice en memoria de nombres + sinónimos (normalizados, sin acentos) y ranking exacto > prefijo > tokens.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-022 · UI búsqueda global ("one search box")

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 50 min
- **Área:** frontend
- **Dueño sugerido:** zoe-1
- **Objetivo:** caja de búsqueda arriba al centro (atajo `/`), resultados agrupados por tipo con el sinónimo que coincidió; cada tipo abre el lugar correcto del grafo.
- **Rubric:** CRAFT, PP, GQ
- **Depende de:** Ninguna (usa el contrato de HACK-021; mock etiquetado mientras no esté integrada)
- **Relacionadas:** HACK-021, HACK-023, HACK-024, HACK-028
- **Archivos probables:** web/src/features/search/
- **Contratos consumidos:** `GET /api/search` (HACK-021), web/src/lib/store.ts
- **Criterios de aceptación:**
  - Enfermedad → `selectedId` (inspector + estrella); síntoma → se añade a `terms`; gen o mecanismo → abre el Pathway Navigator (`step = "pathway"`) de su primera enfermedad; grupo o activo → `step = "action"`.
  - Teclado completo (flechas, Enter, Esc), estados vacío/cargando/error, sin solaparse con otros paneles a 1280×720.
- **Cómo verificar:** npm --prefix web run build
- **Siguiente paso:** overlay con input y lista de resultados; luego navegación por teclado.
- **Riesgos o decisiones pendientes:** coordinar posición con HACK-028 (cabecera).

## HACK-023 · API Pathway: subgrafo tipado de una enfermedad

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 45 min
- **Área:** backend
- **Dueño sugerido:** joahan-2
- **Objetivo:** el grafo que pide el reto (enfermedad, gen, mecanismo, enfermedad relacionada, grupo, activo, investigador) con cada arista explicada, listo para dibujarse.
- **Rubric:** GQ, EI, PP
- **Depende de:** Ninguna
- **Relacionadas:** HACK-024, HACK-025, HACK-027
- **Archivos probables:** app/routers/pathway.py, app/services/pathway.py, app/tests/test_pathway.py, web/src/features/inspector/ (botón "Open pathway")
- **Contratos consumidos:** app/fixtures/deep/deep.json; HACK-025 y HACK-027 cuando existan (opcionales)
- **Criterios de aceptación:**
  - `GET /api/pathway/{disease_id}` → `{center, nodes:[{id, type, label}], edges:[{id, src, dst, type, evidence_level, source_url|null, summary}], coverage:{searched[], missing[]}}`; aristas estructurales (enfermedad–gen, gen–mecanismo, grupo–enfermedad, activo–enfermedad) citan su fuente curada.
  - Fuera del cluster: subgrafo mínimo + `coverage.missing` honesto (no 404 vacío). Botón "Open pathway" en el inspector.
- **Cómo verificar:** uv run pytest -q app/tests/test_pathway.py
- **Siguiente paso:** construir nodos y aristas desde deep.json para ORPHA:34515.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-024 · UI Pathway Navigator (la constelación se vuelve atlas)

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 90 min
- **Área:** frontend
- **Dueño sugerido:** saus-1
- **Objetivo:** la vista estrella para Maria: el subgrafo tipado alrededor de su enfermedad, con forma o icono por tipo de nodo y la arista codificada por nivel de evidencia (observado sólido, inferido discontinuo, hipótesis punteado, contradictorio en el color de alerta), con leyenda.
- **Rubric:** GQ, EI, CRAFT
- **Depende de:** Ninguna (usa el contrato de HACK-023; mock etiquetado mientras no esté integrada)
- **Relacionadas:** HACK-006, HACK-019, HACK-022, HACK-023
- **Archivos probables:** web/src/features/pathway/
- **Contratos consumidos:** `GET /api/pathway/{id}` (HACK-023), store (`step = "pathway"`, `selectedId`, `highlightedEdgeId`)
- **Criterios de aceptación:**
  - Clic en arista → resumen, fuente y nivel; clic en enfermedad relacionada → la convierte en centro; "Next steps" lleva a la acción. Transición desde la constelación (no corte brusco); reduced-motion respetado.
  - Legible a 1280×720 con ~25 nodos; contraejemplo FKRP (serie alélica) visible como tal.
- **Cómo verificar:** npm --prefix web run build
- **Siguiente paso:** layout radial por tipo alrededor del centro; luego estilos de arista por evidencia.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-025 · Clusters defendibles por fenotipo ("who shares our disease characteristics?")

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** datos, backend
- **Dueño sugerido:** cris-1
- **Objetivo:** vecinos fenotípicos por enfermedad con similitud ponderada por informatividad (IC) y los fenotipos compartidos que la explican, para todo el atlas.
- **Rubric:** GQ, EI
- **Depende de:** Ninguna
- **Relacionadas:** HACK-023, HACK-012
- **Archivos probables:** data/similarity.py, app/fixtures/similarity/, app/routers/similar.py, app/services/similar.py, app/tests/test_similar.py, docs/similarity.md
- **Contratos consumidos:** app/fixtures/graph/annotations.json
- **Criterios de aceptación:**
  - `GET /api/similar/{id}?k=10` → vecinos con `score`, `shared:[{hpo_id,label,ic}]` y si comparten gen/mecanismo curado; build offline reproducible (`--check`).
  - Evidencia en docs: para LGMD R9, cuántas distroglicanopatías caen en su top-10 frente al azar; un contraejemplo (fenotipo parecido, mecanismo distinto, p. ej. Pompe).
- **Cómo verificar:** python3 data/similarity.py --check
- **Siguiente paso:** IC = −log(fracción de enfermedades con el término propagado); similitud = suma de IC compartido / unión.
- **Riesgos o decisiones pendientes:** tamaño del fixture (< 5 MB, top-k).

## HACK-026 · Propuesta de colaboración con fuentes para Maria

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 60 min
- **Área:** backend, frontend, ia
- **Dueño sugerido:** joahan-1 (tras HACK-021)
- **Objetivo:** "she approaches a partner with a sourced proposal": un borrador de una página, redactado por gpt-6.1-sol, citando sólo aristas, activos y grupos existentes; qué es reutilizable, qué difiere y qué debe revisar un experto.
- **Rubric:** PP, EI, X10
- **Depende de:** Ninguna
- **Relacionadas:** HACK-020, HACK-011
- **Archivos probables:** app/routers/proposal.py, app/services/proposal.py, app/tests/test_proposal.py, app/fixtures/proposal/proposal_recorded.json, web/src/features/proposal/, web/src/features/action/ (botón)
- **Contratos consumidos:** app/fixtures/deep/deep.json, `POST /api/action-plan`
- **Criterios de aceptación:**
  - `POST /api/proposal {disease_id, partner_disease_id?}` → texto con `[id]` válidos, lista de citas y "Questions for expert review"; el backend borra citas inexistentes; DEMO_MODE devuelve la grabación real.
  - Botón "Draft a proposal" en la escena de acción; modal con copiar e imprimir.
- **Cómo verificar:** uv run pytest -q app/tests/test_proposal.py
- **Siguiente paso:** endpoint con la grabación para ORPHA:34515 → OMIM:616052.
- **Riesgos o decisiones pendientes:** Ninguno

## HACK-027 · Connector: investigadores, financiamiento y literatura extraída con OpenAI

- **Tipo:** feature
- **Prioridad:** P1
- **Estimación:** 75 min
- **Área:** datos, backend, ia
- **Dueño sugerido:** cris-1 (tras HACK-025)
- **Objetivo:** Módulo 3.3 del brief: comunidades "no relacionadas" que comparten investigadores o programas financiados, y aristas candidatas extraídas de resúmenes de PubMed con OpenAI, cada una con PMID y cita textual.
- **Rubric:** GQ, EI, PP
- **Depende de:** Ninguna
- **Relacionadas:** HACK-023, HACK-026
- **Archivos probables:** data/connector.py, app/fixtures/connector/, app/routers/connector.py, app/services/connector.py, app/tests/test_connector.py
- **Contratos consumidos:** NIH RePORTER API v2, PubMed E-utilities, gpt-6-luna (JSON Schema)
- **Criterios de aceptación:**
  - Para el cluster (FKRP, FKTN, CRPPA, POMT1, POMGNT1, LARGE1, GAA): PIs y organizaciones con proyecto y URL; "shared investigators" entre dos enfermedades cuando existan; aristas extraídas como `inferido` con PMID, quote y "AI-extracted, unreviewed".
  - `GET /api/connector/{id}`; snapshot reproducible sin red; nunca datos personales fuera de fuentes públicas.
- **Cómo verificar:** uv run pytest -q app/tests/test_connector.py
- **Siguiente paso:** RePORTER por gen y PubMed esearch+efetch de 20 resúmenes por gen.
- **Riesgos o decisiones pendientes:** coste y límites de API: snapshot primero.

## HACK-028 · Rediseño integral con el criterio del humano de Saus

- **Tipo:** design
- **Prioridad:** P0
- **Estimación:** 120 min
- **Área:** frontend, diseño
- **Dueño sugerido:** saus-1 (con su humano)
- **Objetivo:** que la app se sienta definitiva: Saus pregunta a su humano qué no le gusta y qué haría increíble la experiencia, y lo convierte en cambios; cabecera con espacio para la búsqueda, jerarquía clara del recorrido Maria → acción, onboarding de 1 línea ("Start with a disease, a gene or a symptom"), botón de gestos sin tapar paneles, consistencia de paneles a 1280×720 y 1440×900.
- **Rubric:** CRAFT, PP
- **Depende de:** Ninguna
- **Relacionadas:** todas las de UI
- **Archivos probables:** web/DESIGN.md, web/src/theme.css, web/src/ui/, web/src/App.tsx (autorizado por su dueño joahan-1 para esta ola), web/src/features/graph/, web/src/features/gestures/
- **Contratos consumidos:** docs/FRONTEND-BRIEF.md, brief del reto ("Low ink, high signal", "Progressive reveal")
- **Criterios de aceptación:**
  - Lista de cambios pedidos por su humano en DESIGN.md (sección "Ola 3") y cada uno resuelto o descartado con motivo.
  - Los checks de Chromium existentes (dictation, diagnosis, inspector, action, nav) siguen verdes; capturas antes/después.
- **Cómo verificar:** npm --prefix web run build
- **Siguiente paso:** preguntar al humano y priorizar 5 cambios de mayor impacto visual.
- **Riesgos o decisiones pendientes:** cambios en `web/src/ui/` y App.tsx avisar con `hack msg related:HACK-028 --kind contract`.
