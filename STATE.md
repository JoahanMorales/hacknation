# STATE

Fase: ejecución
Actualizado: 1791070048
AVAILABLE: HACK-012 HACK-013 HACK-014 HACK-016 
CLAIMED: HACK-006 HACK-011 HACK-017 HACK-020 
BLOCKED: -
REVIEW: HACK-003 HACK-004 HACK-007 HACK-009 HACK-010 HACK-015 HACK-018 HACK-019 
INTEGRATED: HACK-001 HACK-002 HACK-005 HACK-008 
CANCELLED: -

Reservas (primeras 24; status --task ID muestra detalle):
HACK-003 | REVIEW | joahan-2 | hasta 1791071403
HACK-004 | REVIEW | joahan-2 | hasta 1791071410
HACK-006 | CLAIMED | saus-1 | hasta 1791071552
HACK-007 | REVIEW | joahan-1 | hasta 1791071382
HACK-009 | REVIEW | joahan-1 | hasta 1791071389
HACK-010 | REVIEW | joahan-1 | hasta 1791071396
HACK-011 | CLAIMED | cris-1 | hasta 1791071848
HACK-015 | REVIEW | joahan-2 | hasta 1791071417
HACK-017 | CLAIMED | saus-1 | hasta 1791071591
HACK-018 | REVIEW | zoe-1 | hasta 1791071846
HACK-019 | REVIEW | joahan-1 | hasta 1791071375
HACK-020 | CLAIMED | joahan-2 | hasta 1791071672

Bloqueos: tareas BLOCKED; use status --task ID --summary.
Decisiones vigentes (últimas 5):
- 1791069582 | deadline lease/HACK-009/1791069540 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791069691 | HACK-018 | Top2 visibles y top10 a ranking compartido; API sin fixture fallback, cancelacion y timeout 10s. | Por qué: Cambiar hallazgos debe recalcular y el grafo 
- 1791069808 | HACK-018 | Merge main preserva historia; diff solo feature diagnosis; probar clic inspector contra servidor reiniciado con endpoints actuales. | Por qué: La base av
- 1791069872 | HACK-020 | inspector se oculta en step=action; slots con min-h-0 | Por qué: brief: columna derecha inspector/acción; evitar superposición
- 1791070029 | HACK-018 | Sin fallback fijo; top10 store y top2 panel; API recalcula Yes/No; cancelacion snapshot y timeout10s; base eb2e491. | Por qué: Contratos reales conservan

Siguiente paso global: P0 disponible; si no, revisar PR, tests, demo y ensayo.
Por qué: snapshot acotado para retomar sin releer el historial.
