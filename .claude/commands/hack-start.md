---
description: Toma la siguiente tarea y deja listo su worktree (claim incluido)
argument-hint: "[HACK-NNN] [nombre-agente]"
---

Objetivo: pasar de cero a editando código en < 2 min. Argumentos: $ARGUMENTS

1. Si ya estás en un worktree con `.hack-env` y su tarea sigue CLAIMED, NO reclames otra: sigue el "Siguiente" del resumen (`bash scripts/hack status --task $HACK_TASK --summary`).
2. Si no: `bash scripts/hack next` y elige la candidata que devuelve (o la del argumento). Lee sólo la sección `## HACK-NNN` de TASKS.md (usa `grep -n -A25 '^## HACK-NNN' TASKS.md`).
3. Identidad: usa el nombre del argumento o `HACK_AGENT`; si no hay, pídeselo al humano UNA vez (formato `persona-N`, p. ej. `ana-1`).
4. `bash scripts/wt new HACK-NNN --agent NOMBRE --next "<primer paso exacto>"`.
   - CONFLICT (código 3): otra reserva ganó o traslapa archivos → vuelve a `next` y toma otra. No insistas.
   - Gate de autonomía/backlog: díselo al humano en una línea y toma trabajo ocioso (R35).
5. Indica al humano: `cd <worktree>` y abrir el agente ahí. Si TÚ ya puedes operar en ese directorio, continúa implementando desde allí.
6. Lee el hilo de tu tarea (`bash scripts/hack inbox --task HACK-NNN`, `wt` ya lo imprime) y tu inbox: pueden traer contratos o peticiones de tareas relacionadas.
7. Implementa el incremento vertical mínimo que cumpla el primer criterio; commit + push de la rama (`git push -u origin feat/hack-nnn`) al ponerse verde.
