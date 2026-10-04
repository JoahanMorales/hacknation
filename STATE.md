# STATE

Fase: ejecución
Actualizado: 1791093109
AVAILABLE: -
CLAIMED: HACK-032 HACK-033 
BLOCKED: HACK-014 
REVIEW: HACK-022 HACK-028 HACK-029 HACK-031 
INTEGRATED: HACK-001 HACK-002 HACK-003 HACK-004 HACK-005 HACK-006 HACK-007 HACK-008 HACK-009 HACK-010 HACK-011 HACK-012 
CANCELLED: -

Reservas (primeras 24; status --task ID muestra detalle):
HACK-014 | BLOCKED | zoe-1 | hasta 1791092671
HACK-022 | REVIEW | joahan-1 | hasta 1791094197
HACK-028 | REVIEW | saus-1 | hasta 1791093956
HACK-029 | REVIEW | saus-1 | hasta 1791094909
HACK-031 | REVIEW | cris-1 | hasta 1791093761
HACK-032 | CLAIMED | joahan-2 | hasta 1791094836
HACK-033 | CLAIMED | joahan-1 | hasta 1791093804

Bloqueos: tareas BLOCKED; use status --task ID --summary.
Decisiones vigentes (últimas 5):
- 1791091962 | deadline lease/HACK-029/1791091560 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791091961 | HACK-031 | inspector oculto en pathway con 1 línea fuera de Archivos | Por qué: criterio de aceptación; HACK-019 sin reserva activa
- 1791092763 | deadline lease/HACK-014/1791092671 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791092763 | deadline lease/HACK-030/1791092471 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791093036 | HACK-032 | no parchear el check a ciegas | Por qué: el fallo restante es layout del shell (HACK-028)

Siguiente paso global: P0 disponible; si no, revisar PR, tests, demo y ensayo.
Por qué: snapshot acotado para retomar sin releer el historial.
