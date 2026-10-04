# STATE

Fase: ejecución
Actualizado: 1791083599
AVAILABLE: HACK-027 HACK-028 
CLAIMED: HACK-014 
BLOCKED: HACK-022 
REVIEW: HACK-013 HACK-024 HACK-025 HACK-026 
INTEGRATED: HACK-001 HACK-002 HACK-003 HACK-004 HACK-005 HACK-006 HACK-007 HACK-008 HACK-009 HACK-010 HACK-011 HACK-012 HACK-015 HAC
CANCELLED: -

Reservas (primeras 24; status --task ID muestra detalle):
HACK-013 | REVIEW | saus-1 | hasta 1791081124
HACK-014 | CLAIMED | zoe-1 | hasta 1791083099
HACK-022 | BLOCKED | zoe-1 | hasta 1791084930
HACK-024 | REVIEW | saus-1 | hasta 1791085225
HACK-025 | REVIEW | cris-1 | hasta 1791085304
HACK-026 | REVIEW | joahan-2 | hasta 1791085391

Bloqueos: tareas BLOCKED; use status --task ID --summary.
Decisiones vigentes (últimas 5):
- 1791081963 | HACK-022 | Verificar Chromium contra API21 revisada en8768 + Vite5174; comprobar tambien bundle produccion. | Por qué: Mock solo ante404 o eleccion explicita; error
- 1791082350 | HACK-025 | poda branch-and-bound con cota superior en vez de preselección top-N | Por qué: preselección perdía 10-15% de vecinos; la cota es exacta y 0.03 s/enfe
- 1791082718 | HACK-022 | Correr smoke actual; crear PR draft con deuda explicita del toggle Gestures. No marcar done hasta criterio layout completo. | Por qué: 014 sigue con requ
- 1791083249 | deadline lease/HACK-014/1791083099 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791083249 | deadline lease/HACK-023/1791083127 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.

Siguiente paso global: P0 disponible; si no, revisar PR, tests, demo y ensayo.
Por qué: snapshot acotado para retomar sin releer el historial.
