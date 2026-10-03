---
model: sonnet
description: Checkpoint + handoff antes de cerrar o compactar la sesión
argument-hint: "[HACK-NNN]"
---

Tarea: ${ARGUMENTS:-$HACK_TASK}.

1. Commit y push de todo lo que compile/pase tests (`git push -u origin HEAD`). Lo que no pase: commit en la rama igual, con mensaje `wip:` explicando qué falla.
2. `bash scripts/hack checkpoint ID --done "<criterios verdes>" --decision "<decisión clave o ->" --why "<por qué>" --fails "<qué falla y error exacto o ->" --commands "<comandos de verificación usados>" --next "<acción exacta: archivo/función/comando>"`.
3. `bash scripts/hack handoff ID`.
4. Responde al humano en ≤ 3 líneas: estado, siguiente paso exacto, bloqueos.
5. La siguiente sesión empieza con `bash scripts/wt session` en el mismo worktree.
