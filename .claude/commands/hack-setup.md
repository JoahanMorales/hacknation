---
description: Configuración del evento (humano + agente, minuto 0)
---

Guía al humano para dejar HACKATHON.md publicable. Pregunta SOLO lo que falte, todo junto en un mensaje:

- Nombre del evento, hora de inicio y de entrega oficial (con zona IANA), formato de submission (repo/video/deck/form), reglas de IA y código previo, rubric oficial con pesos, personas (nombres cortos) y quién envía la submission.

Luego:

1. Completa HACKATHON.md: parámetros, rubric (pesos suman 100), reglas, plan B, y el bloque ejecutable:
   - `Freeze-Epoch:` = epoch de inicio + 18 h (o 6 h antes del fin) → `date -j -f "%Y-%m-%d %H:%M" "AAAA-MM-DD HH:MM" +%s` en macOS, `date -d "..." +%s` en Linux.
   - `Backlog-Proposed-Epoch: 0`, `Backlog-Approved: no` hasta que el humano apruebe el backlog de `/hack-plan`.
   - Confirma con el humano `Autonomy: yes` y `Auto-Merge: yes` (ya vienen en yes; si el humano dice no, cámbialos).
2. Si existe la idea: copia IDEA.template.md → IDEA.md y llénala con el humano (problema, usuario, flujo, wow, riesgos). Si no, deja ese paso para después.
3. `git config core.hooksPath .githooks` y `bash scripts/smoke --package-only` (debe terminar en `PACKAGE_PASS`; sólo una vez por máquina, tarda unos minutos).
4. Registra revisores: cada humano ejecuta `HACK_HUMAN=<su-nombre> bash scripts/hack register-reviewer <agente-de-otro>` para habilitar revisión cruzada sin claim.
5. Commit `setup: evento` y push a `main`. Siguiente: `/hack-plan`.
