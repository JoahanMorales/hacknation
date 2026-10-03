# STATE

Fase: ejecución
Actualizado: 1791066113
AVAILABLE: HACK-006 HACK-007 HACK-008 HACK-010 HACK-011 HACK-012 HACK-013 HACK-014 HACK-015 HACK-016 HACK-017 HACK-018 HACK-019 HAC
CLAIMED: HACK-004 HACK-005 
BLOCKED: -
REVIEW: HACK-001 HACK-003 HACK-009 
INTEGRATED: HACK-002 
CANCELLED: -

Reservas (primeras 24; status --task ID muestra detalle):
HACK-001 | REVIEW | joahan-1 | hasta 1791066882
HACK-003 | REVIEW | joahan-2 | hasta 1791067800
HACK-004 | CLAIMED | joahan-2 | hasta 1791067826
HACK-005 | CLAIMED | zoe-1 | hasta 1791067913
HACK-009 | REVIEW | joahan-1 | hasta 1791067794

Bloqueos: tareas BLOCKED; use status --task ID --summary.
Decisiones vigentes (últimas 5):
- 1791064294 | HACK-002 | IDs OMIM/ORPHA/MONDO; graph groups HPO y layout de HACK003 fijado por commit | Por qué: IDEA6 y compatibilidad con consumidor; sin forzar ranking demo
- 1791064470 | HACK-002 | IDEA6 OMIM/ORPHA/MONDO; groups HPO; mocks etiquetados y hashes LF | Por qué: Fuente real calculada, compatibilidad y reproduccion Windows/Unix
- 1791064887 | HACK-002 | Admitir DECIPHER y conservar 12867 enfermedades como endpoint real | Por qué: Compatibilidad con datos publicados y solicitud del responsable via joahan-
- 1791065063 | deadline lease/HACK-001/1791065035 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791065574 | HACK-009 | FKTN puente ribitol = hipotesis | Por qué: no hay estudio preclínico de ribitol en FKTN

Siguiente paso global: P0 disponible; si no, revisar PR, tests, demo y ensayo.
Por qué: snapshot acotado para retomar sin releer el historial.
