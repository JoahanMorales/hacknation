# TASKS · Backlog estático

Copiar como `TASKS.md` y sustituir el ejemplo por tareas de un único resultado principal. Por qué: incrementos pequeños y verticales facilitan revisión, demo y recuperación.

No añadir ni editar un campo de estado aquí; consultar `bash scripts/hack status`. Por qué: el estado de tarea, reserva y bitácora vive sólo en la rama `claims`.

Mantener IDs únicos `HACK-NNN`, prioridades `P0/P1/P2` y tipos `setup/feature/bug/integration/demo/docs/spike/contract`. Por qué: el vocabulario estable permite automatizar coordinación y comparar tareas.

Usar `Área` con uno o más valores y `Archivos probables` como rutas relativas separadas por comas, incluyendo directorios con `/` final o globs cuando haga falta. Por qué: un incremento puede cruzar áreas y la reserva debe cubrir todos sus archivos reales.

Indicar dependencias con IDs explícitos o `Ninguna`; en `Relacionadas` listar tareas que comparten contrato, endpoint o datos sin bloquearse (alimenta `hack msg related:ID` y los avisos automáticos de integración), una estimación y un comando exacto en `Cómo verificar`. Por qué: un agente debe poder decidir si puede empezar y cómo demostrar que terminó.

Mapear cada P0 a IDs del rubric; registrar dueños compartidos en `OWNERS.md`. Por qué: las tareas críticas deben aportar puntos y evitar conflictos en contratos, lockfiles, migraciones y tipos.

## Corte y primera ola

- Línea de corte: P0.
- Ruta crítica de demo: `<IDs en orden del recorrido>`.
- Contratos / esquemas / mocks publicados antes de la ola: `<rutas y revisión>`.
- Primera ola: `<spikes independientes>` y `<walking skeleton con mocks>` y `<incrementos que usan contratos publicados>`.
- Dueños de recursos compartidos: `OWNERS.md`.
- Freeze: `<hora copiada de HACKATHON.md>`.

No introducir una dependencia serial universal de `HACK-001`; usar contratos ya publicados y dependencias sólo donde el resultado lo exige. Por qué: la numeración no convierte una tarea en prerrequisito de todo el equipo.

## HACK-001 · `<resultado visible y único>`

- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 45 min
- **Área:** backend, datos
- **Objetivo:** `<acción del usuario y resultado observable>`.
- **Rubric:** C1, C3
- **Depende de:** Ninguna
- **Relacionadas:** HACK-002
- **Archivos probables:** app/routers/example.py, app/services/example.py, app/tests/test_example.py
- **Contratos consumidos:** `<ruta y versión publicados>`.
- **Criterios de aceptación:**
  - `<dada una entrada, se observa un resultado exacto>`.
  - `<caso de fallo o límite verificable>`.
  - `bash scripts/smoke` termina con código 0.
- **Cómo verificar:** `uv run pytest -q app/tests/test_example.py`
- **Siguiente paso:** `<acción exacta al arrancar, con ruta o comando>`.
- **Riesgos o decisiones pendientes:** Ninguno

Reemplazar las rutas, criterios y comando del ejemplo antes de reclamarlo. Por qué: una plantilla no es evidencia de que el comportamiento del producto exista.

## HACK-002 · `<validar un riesgo técnico>`

- **Tipo:** spike
- **Prioridad:** P0
- **Estimación:** 30 min, límite estricto
- **Área:** backend, datos
- **Objetivo:** `<resolver una incertidumbre concreta y documentar una decisión>`.
- **Rubric:** C2
- **Depende de:** Ninguna
- **Archivos probables:** spikes/example.py, docs/spikes/example.md
- **Contratos consumidos:** `<interfaz mínima publicada>`.
- **Criterios de aceptación:**
  - `<prueba real produce una medición o fallo reproducible>`.
  - `<decisión y fallback registrados en DECISIONS.md vía checkpoint>`.
  - `bash scripts/smoke` termina con código 0.
- **Cómo verificar:** `uv run python spikes/example.py --verify`
- **Siguiente paso:** `<prueba mínima que debe ejecutar el agente>`.
- **Riesgos o decisiones pendientes:** `<fallback con mocks si falla>`.

Crear tareas `integration` dependientes del spike relevante cuando sustituyan mocks por capacidades reales. Por qué: el riesgo se valida antes de integrar, mientras la demo falsa puede avanzar en paralelo.
