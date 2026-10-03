# STATE

Fase: ejecución
Actualizado: 1791069589
AVAILABLE: HACK-012 HACK-013 HACK-014 HACK-016 HACK-020 
CLAIMED: HACK-006 HACK-011 HACK-017 HACK-018 
BLOCKED: -
REVIEW: HACK-003 HACK-004 HACK-007 HACK-009 HACK-010 HACK-015 HACK-019 
INTEGRATED: HACK-001 HACK-002 HACK-005 HACK-008 
CANCELLED: -

Reservas (primeras 24; status --task ID muestra detalle):
HACK-003 | REVIEW | joahan-2 | hasta 1791069521
HACK-004 | REVIEW | joahan-2 | hasta 1791069528
HACK-006 | CLAIMED | saus-1 | hasta 1791070124
HACK-007 | REVIEW | joahan-1 | hasta 1791071382
HACK-009 | REVIEW | joahan-1 | hasta 1791071389
HACK-010 | REVIEW | joahan-1 | hasta 1791070385
HACK-011 | CLAIMED | cris-1 | hasta 1791070208
HACK-015 | REVIEW | joahan-2 | hasta 1791070399
HACK-017 | CLAIMED | saus-1 | hasta 1791070912
HACK-018 | CLAIMED | zoe-1 | hasta 1791070919
HACK-019 | REVIEW | joahan-1 | hasta 1791071375

Bloqueos: tareas BLOCKED; use status --task ID --summary.
Decisiones vigentes (últimas 5):
- 1791069119 | HACK-018 | API real sin fallback estatico; snapshot y AbortController; timeout10s; dos candidatos y top10 al grafo | Por qué: Evitar diagnosticos viejos y mantener 
- 1791069539 | deadline lease/HACK-003/1791069521 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791069539 | deadline lease/HACK-004/1791069528 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791069539 | deadline lease/HACK-007/1791069534 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791069582 | deadline lease/HACK-009/1791069540 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.

Siguiente paso global: P0 disponible; si no, revisar PR, tests, demo y ensayo.
Por qué: snapshot acotado para retomar sin releer el historial.
