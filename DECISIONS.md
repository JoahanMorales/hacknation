# DECISIONS

Decisiones de coordinación en la rama claims.
Por qué: una opción reversible a los 15 min permite seguir.
- 1791062709 | HACK-001 | store.step = escenas del brief; API_PORT configurable en proxy de Vite | Por qué: Puerto 8000 ocupado en la Jetson por otro proyecto
- 1791063477 | HACK-002 | Ranking calculado de HPO sin forzar top2; mocks etiquetados | Por qué: Fuentes reales, hashes y limites explicitos
- 1791063782 | HACK-003 | IDs HPO como strings legibles (annotations 7.8 MB, 1.1 MB gz) | Por qué: evitar conversiones en HACK-007/012/002
- 1791064281 | HACK-003 | overview usa nodes (contrato HACK-002) | Por qué: HACK-002 es dueño del contrato
- 1791064294 | HACK-002 | IDs OMIM/ORPHA/MONDO; graph groups HPO y layout de HACK003 fijado por commit | Por qué: IDEA6 y compatibilidad con consumidor; sin forzar ranking demo
