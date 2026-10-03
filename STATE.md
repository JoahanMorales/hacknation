# STATE

Fase: ejecución
Actualizado: 1791063782
AVAILABLE: HACK-004 HACK-005 HACK-006 HACK-007 HACK-008 HACK-009 HACK-010 HACK-011 HACK-012 HACK-013 HACK-014 HACK-015 HACK-016 HAC
CLAIMED: HACK-002 HACK-003 
BLOCKED: -
REVIEW: HACK-001 
INTEGRATED: -
CANCELLED: -

Reservas (primeras 24; status --task ID muestra detalle):
HACK-001 | REVIEW | joahan-1 | hasta 1791065035
HACK-002 | CLAIMED | zoe-1 | hasta 1791065277
HACK-003 | CLAIMED | joahan-2 | hasta 1791065582

Bloqueos: tareas BLOCKED; use status --task ID --summary.
Decisiones vigentes (últimas 5):
- 1791062709 | HACK-001 | store.step = escenas del brief; API_PORT configurable en proxy de Vite | Por qué: Puerto 8000 ocupado en la Jetson por otro proyecto
- 1791063477 | HACK-002 | Ranking calculado de HPO sin forzar top2; mocks etiquetados | Por qué: Fuentes reales, hashes y limites explicitos
- 1791063782 | HACK-003 | IDs HPO como strings legibles (annotations 7.8 MB, 1.1 MB gz) | Por qué: evitar conversiones en HACK-007/012/002

Siguiente paso global: P0 disponible; si no, revisar PR, tests, demo y ensayo.
Por qué: snapshot acotado para retomar sin releer el historial.
