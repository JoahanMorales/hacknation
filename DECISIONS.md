# DECISIONS

Decisiones de coordinación en la rama claims.
Por qué: una opción reversible a los 15 min permite seguir.
- 1791062709 | HACK-001 | store.step = escenas del brief; API_PORT configurable en proxy de Vite | Por qué: Puerto 8000 ocupado en la Jetson por otro proyecto
- 1791063477 | HACK-002 | Ranking calculado de HPO sin forzar top2; mocks etiquetados | Por qué: Fuentes reales, hashes y limites explicitos
- 1791063782 | HACK-003 | IDs HPO como strings legibles (annotations 7.8 MB, 1.1 MB gz) | Por qué: evitar conversiones en HACK-007/012/002
- 1791064281 | HACK-003 | overview usa nodes (contrato HACK-002) | Por qué: HACK-002 es dueño del contrato
- 1791064294 | HACK-002 | IDs OMIM/ORPHA/MONDO; graph groups HPO y layout de HACK003 fijado por commit | Por qué: IDEA6 y compatibilidad con consumidor; sin forzar ranking demo
- 1791064470 | HACK-002 | IDEA6 OMIM/ORPHA/MONDO; groups HPO; mocks etiquetados y hashes LF | Por qué: Fuente real calculada, compatibilidad y reproduccion Windows/Unix
- 1791064887 | HACK-002 | Admitir DECIPHER y conservar 12867 enfermedades como endpoint real | Por qué: Compatibilidad con datos publicados y solicitud del responsable via joahan-2
- 1791065063 | deadline lease/HACK-001/1791065035 | REQUIRES_RECOVERY | Reserva conservada; leer resumen y usar release --expired --read-summary. No borra trabajo.
- 1791065574 | HACK-009 | FKTN puente ribitol = hipotesis | Por qué: no hay estudio preclínico de ribitol en FKTN
- 1791066325 | HACK-004 | gpt-6-luna + gpt-live-transcribe confirmados | Por qué: probados con la cuenta del equipo
- 1791066699 | HACK-007 | semántica de generate.py de HACK-002; labels añadidos a annotations.json | Por qué: API real y ejemplos de la UI dan los mismos números
- 1791066841 | HACK-005 | Paleta oscura y acento calido; montaje kit solicitado a HACK-001 | Por qué: Scope mantiene un escritor por App.tsx
- 1791067165 | HACK-005 | Compactar alturas bajo760 para kit1280x720 | Por qué: Primera captura1280 requerio scroll vertical; mantener lectura de una vista
- 1791067279 | HACK-005 | Compacto bajo760 con captura completa1280x720 | Por qué: Aceptar brief proyector y recuperar todos los estados sin cambios de diagnostico
- 1791067343 | HACK-008 | ES: traducción previa sólo para buscar candidatos; sinónimos HPO en annotations.json | Por qué: HPO sólo trae sinónimos en inglés
- 1791067474 | HACK-005 | Nombre accesible de chips contiene texto visible para reconocimiento por voz | Por qué: Corregir label-content-name-mismatch de Lighthouse; mantener UI negacion visible
- 1791067593 | HACK-006 | cosmos.gl aprobado; Canvas queda como plan B | Por qué: Avanzar sin esperar el paquete de HACK-001
- 1791067693 | deadline decision/HACK-006-1791066766/1791067666 | REVERSIBLE_AND_LOG | Opción: Constelacion con cosmos.gl (@cosmograph/cosmos) en lugar de sigma.js; sigma queda como respaldo; Por qué: Humano (Saus) lo aprobo: GPU para 12,867 puntos y ola de poda fluida, la demo es el momento estrella; sin ampliar dinero, cuentas, publicación ni alcance.
- 1791067854 | HACK-005 | Contrato visual CSS nativo oscuro, seis mecanismos semanticos y acento calido; fuente de fixtures explicita | Por qué: Cumplir brief y permitir consumidores paralelos sin tocar App ni dependencias
- 1791067965 | HACK-010 | fallback: grabada o resúmenes curados con citas | Por qué: nada sin fuente
- 1791068196 | HACK-018 | Consumir componentes de PR11 sin duplicarlos; el PR18 se publicara con diff propio tras integrar el contrato visual | Por qué: Un sistema compartido y cambios limitados a features/diagnosis; snapshot evita respuestas obsoletas
- 1791068324 | HACK-006 | @cosmograph/cosmos CC-BY-NC aceptado por Saus (no comercial) | Por qué: Demo es el momento estrella
- 1791068408 | HACK-011 | puentes excluyen differential_diagnosis; Pompe propone DBS | Por qué: Maria necesita comunidades, no diferenciales; DBS citado en IDEA 11
- 1791068442 | HACK-015 | README en inglés | Por qué: jurado global; UI en inglés (IDEA §10)
- 1791069062 | HACK-019 | ?select=ID para demo; resumen sin repetir gen/mecanismo | Por qué: aún no hay clic en estrella (HACK-006)
