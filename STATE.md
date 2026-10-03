# STATE

Fase: ejecución
Actualizado: 1791071141
AVAILABLE: HACK-012 HACK-013 HACK-014 
CLAIMED: HACK-006 HACK-016 HACK-017 HACK-018 
BLOCKED: -
REVIEW: HACK-003 HACK-004 HACK-007 HACK-009 HACK-015 HACK-019 HACK-020 
INTEGRATED: HACK-001 HACK-002 HACK-005 HACK-008 HACK-010 HACK-011 
CANCELLED: -

Reservas (primeras 24; status --task ID muestra detalle):
HACK-003 | REVIEW | joahan-2 | hasta 1791071403
HACK-004 | REVIEW | joahan-2 | hasta 1791071410
HACK-006 | CLAIMED | saus-1 | hasta 1791071552
HACK-007 | REVIEW | joahan-1 | hasta 1791071382
HACK-009 | REVIEW | joahan-1 | hasta 1791071389
HACK-015 | REVIEW | joahan-2 | hasta 1791071417
HACK-016 | CLAIMED | joahan-1 | hasta 1791072879
HACK-017 | CLAIMED | saus-1 | hasta 1791071591
HACK-018 | CLAIMED | zoe-1 | hasta 1791072565
HACK-019 | REVIEW | joahan-1 | hasta 1791071375
HACK-020 | REVIEW | joahan-2 | hasta 1791072328

Bloqueos: tareas BLOCKED; use status --task ID --summary.
Decisiones vigentes (últimas 5):
- 1791070383 | HACK-018 | Hook siempre montado, solo render null en action; regression de integracion en check_ui.py. | Por qué: Evita ocupar footer de la escena5 y conserva scori
- 1791070366 | HACK-011 | merge de main en vez de rebase tras push | Por qué: R08 prohíbe force-push
- 1791070528 | HACK-020 | timeline junto a This week; límites en details | Por qué: hallazgo de zoe-1: se salía a 1280x720
- 1791070699 | HACK-018 | Merge API011 y validar plan real antes de volver a REVIEW; nueva SHA incluye base vigente sin cambiar featureajena. | Por qué: Prueba anterior action usa
- 1791070765 | HACK-018 | Mantener regression real roja hasta integrar fix0204751407; probar no equivalente fixture. | Por qué: API011 real contiene2groups/7assets y hace evidente

Siguiente paso global: P0 disponible; si no, revisar PR, tests, demo y ensayo.
Por qué: snapshot acotado para retomar sin releer el historial.
