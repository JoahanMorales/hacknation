---
description: Revisa el PR de otra tarea y registra aprobación/rechazo del SHA
argument-hint: "HACK-NNN"
---

Revisa $ARGUMENTS. Nunca revises una tarea tuya (el CLI lo rechaza).

1. `bash scripts/hack status --task $ARGUMENTS --summary` → rama, PR y SHA (Task-Tip).
2. `gh pr diff <url>` o `git fetch origin <rama> && git diff origin/main...origin/<rama>`; usa `--stat` primero.
3. Comprueba: criterios de aceptación de TASKS.md, alcance dentro de Archivos probables, sin secretos/contratos/CI, mocks etiquetados (`demo_data`).
4. Ejecuta el "Cómo verificar" en un checkout de esa rama (por ejemplo `git worktree add ../review-tmp origin/<rama>` y quítalo al terminar con `git worktree remove`).
5. Veredicto en < 10 min:
   - OK: `bash scripts/hack review $ARGUMENTS --sha <SHA> --verdict approve`.
   - No OK: `--verdict reject` + `gh pr comment` con lista concreta (archivo:línea, qué falla, cómo verificar).
6. Requisito del CLI: tener un claim propio activo o rol de revisor (`HACK_HUMAN=... bash scripts/hack register-reviewer NOMBRE`, lo ejecuta un humano).
