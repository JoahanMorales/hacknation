---
model: sonnet
description: Revisa el PR de otra tarea y registra aprobación/rechazo del SHA
argument-hint: "HACK-NNN"
---

Delega la revisión completa de $ARGUMENTS en el subagente `hack-reviewer` (contexto aislado: el diff no entra al tuyo). Pásale sólo el ID.

Cuando vuelva (≤ 5 líneas), no repitas su trabajo: si aprobó, listo; si rechazó, ya avisó al dueño con `hack msg`. Sigue con tu tarea.

Requisitos del CLI: no puede ser tu propia tarea; necesitas un claim activo o rol de revisor (`HACK_HUMAN=<humano> bash scripts/hack register-reviewer NOMBRE`).
