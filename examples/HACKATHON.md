# Hackatón de ejemplo · configuración para dry run

- Duración: 24 h; equipo: 4 agentes, 2 humanos, una máquina, GitHub como remoto objetivo.
- Inicio: T0 al publicar backlog; aprobación pedida T0; sin respuesta, P0 a T+10 min.
- Feature freeze: T+20 h; ensayo limpio T+21 h; grabación T+22 h; envío T+23 h.
- Rubric ilustrativo: J1 50%, J2 30%, J3 20%; validar rubric oficial antes de usar fuera del ejemplo.
- IA y código previo: ejemplo local permitido; no presupone reglas de un evento real.
- Ruta crítica: skeleton mock → scoring integrado → ensayo limpio → video → submission.
- Autonomía: código y mocks locales autorizados; no dinero, cuentas, publicación ni producción. Autofusión local sólo con todos los gates comprobados; GitHub requiere configuración real.
- Canal: DECISIONS.md en claims; respuesta en 15 min o decisión reversible autorizada y registro.
- Presupuesto: 4 sesiones iniciales + 4 continuaciones, objetivo 8k tokens/sesión; checkpoint al ~60% y cierre.
- Plan B: video del recorrido estable, fixtures ficticios y ejecución local; no se afirma que el video exista en este paquete.
- Submission: URL repo/accesos, versión integrada, instrucciones, video y declaración de IA revisados por agente demo.
- OWNERS: no hay lockfile, migraciones ni cambios de schema durante la primera ola; vaciar los patrones de ejemplo no aplicables antes de lint.

Mantén estos valores como ejemplo hasta sustituirlos por hechos del evento. Por qué: duración y reglas ilustrativas no son evidencia de una competición real.

Backlog-Proposed-Epoch: 999400
Backlog-Approved: no
Autonomy: yes
Auto-Merge: yes
Freeze-Epoch: 1072000
Events-Per-Session: 100
Checkpoint-Percent: 60
Review-Mode: claims
Merge-Lease-Seconds: 1800
Merge-Wait-Seconds: 180
