# Cambios v2 → v2.1

- tick con recibos CAS únicos: backlog, decisiones, leases, freeze y cola.
- status, heartbeat y next disparan tick; cron/Action opcionales cada cinco minutos.
- Autorización explícita publicada; el timeout no concede permisos sensibles.
- review verifica identidad elegible y SHA; modo gh verifica API y último voto vigente.
- done integrado exige aprobación real y conserva prueba ancestry/tree para squash/rebase.
- merge crea cola/lock leased y valida gates; publicación atómica de base y registro.
- Eventos/checkpoints/sesiones declaradas en claims; umbral bloquea claims nuevos.
- handoff incluye sesiones/pendiente; checkpoint cerrado o --session evita bloqueo sin claim.
- Scanner propio, hook y excepciones ligadas a ruta/regla/blob/revisor.
- next reduce arranque a núcleo + un comando; AGENTS no crece.
- init-smoke ejecuta comando real y conserva fingerprint del adaptador.
- SIN REMOTO y reconciliación explícitos; CLOCK_SKEW >60 s basado en Date.
- Las 40 pruebas originales conservan aserciones; fixtures publican autorización explícita.
- Un caso positivo viejo prepara review real: el nombre distinto dejó de ser prueba válida.
- Nuevas carreras y pruebas se ejecutan desde el mismo smoke; evidence y manifest regenerados.
