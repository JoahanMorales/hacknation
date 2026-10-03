---
description: Verifica, abre PR y pasa la tarea a REVIEW (luego merge si hay aprobación)
argument-hint: "[HACK-NNN]"
---

Tarea: ${ARGUMENTS:-$HACK_TASK}. Ejecuta en orden y para en el primer rojo (arréglalo antes de seguir):

0. `bash scripts/hack inbox`: atiende reject/request/contract pendientes antes de publicar (R55).
1. `git fetch origin main && git rebase origin/main` (sin force; si hay conflicto resuélvelo preservando ambos trabajos).
2. `git diff --stat origin/main...HEAD`: todo dentro de "Archivos probables" de la tarea. Si tocaste algo fuera (lockfile, schemas compartidos, CI), sácalo o anótalo para revisión humana.
3. El comando exacto de "Cómo verificar" de TASKS.md y `bash scripts/smoke` → ambos en 0. Copia el resultado real; no lo resumas como "pasa" sin ejecutarlo.
4. `git push -u origin HEAD` y `gh pr create --title "HACK-NNN · <resultado visible>" --body "<las 5 líneas de .github/pull_request_template.md completadas>"`.
5. `bash scripts/hack done ID --pr URL --evidence "<comando> exit 0; <criterios cumplidos>"` (avisa solo a `all` que hay review pendiente).
   Si cambiaste algo que consumen otras tareas: `bash scripts/hack msg related:ID --kind contract "<qué cambió y qué deben ajustar>"`.
6. `bash scripts/hack checkpoint ID --done ... --decision ... --why ... --fails ... --commands ... --next "Esperar review de SHA <sha>; luego hack merge ID"`.
7. No esperes al humano: el aviso automático pide revisor a los demás agentes. Mientras tanto toma otra tarea con `/hack-start` desde el checkout principal o haz trabajo ocioso (R35).
8. Al recibir `approve` en tu inbox: `bash scripts/hack merge ID` (si recibes `reject`, corrige y repite desde 0). Si cae a cola humana (código 3), deja el motivo de una línea y sigue con otra cosa; el humano lo ve en `hack digest`.
