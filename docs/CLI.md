# CLI portable v2.1

Lee el núcleo una vez y ejecuta `bash scripts/hack next`. Los detalles se cargan ante una opción nueva.
Por qué: el arranque sólo necesita el siguiente paso remoto.

## Entorno

Bash 3.2+, Git con worktrees y utilidades POSIX. Producción no requiere Python ni jq; las pruebas sí requieren Python 3.8+. Windows: Git Bash. `gh` es opcional salvo Review-Mode: gh. Ejecuta desde el repositorio o un worktree; lint e init-smoke también funcionan en el paquete sin remoto.
Por qué: el CLI portable mantiene separadas ejecución, pruebas y aprobación externa.

| Variable | Uso |
|---|---|
| HACK_AGENT | Identidad cooperativa única y estable; letras, números, punto, guion o guion bajo. |
| HACK_HUMAN | Responsable declarado; necesario para registrar otro revisor. |
| HACK_SESSION | ID distinto por sesión/continuación; default stable, sin detección automática de compactación. |
| HACK_REMOTE / HACK_BASE | origin / main por defecto. |
| HACK_LEASE_SECONDS | 1800 s, positivo y acordado por el equipo. |
| HACK_NOW / HACK_REMOTE_NOW | Relojes simulados epoch sólo para pruebas; omitir en uso real. |
| HACK_REVIEW_MODE | claims, gh o auto; override explícito de Review-Mode. |

HACKATHON.md se lee de la base remota. Copia el bloque ejecutable de HACKATHON.template.md: Autonomy y Auto-Merge faltantes equivalen a no; Backlog-Approved: no activa plazo P0 a 600 s con autonomía; Freeze-Epoch: 0 desactiva freeze. Budget default 100 eventos y alerta al 60%. Publica hechos/autorización antes de repartir trabajo.
Por qué: un worktree atrasado o un timeout no concede permisos.

## Datos

TASKS.md y OWNERS.md se leen de la base remota para next y claim, aunque el worktree tenga un plan anterior. TASKS.md es backlog estático: encabezados `## HACK-NNN`, Prioridad P0/P1/P2, Archivos probables separados por comas, Cómo verificar ejecutable y Depende de. Viñetas/negritas/campos planos se admiten. OWNERS.md asigna patrón a ID existente. Freeze-Allowed: yes sólo habilita la tarea durante freeze si está publicado en base.
Por qué: alcance, autoridad y verificación deben ser comunes antes de abrir worktrees.

| Rama claims | Función |
|---|---|
| tasks/ID.md y claims/ID.md | Registro duradero y reserva mientras CLAIMED/BLOCKED/REVIEW. |
| worklog/WL*.md | Resumen vivo de seis campos, historial append-only de una línea/evento. |
| STATE.md / DECISIONS.md | Snapshot acotado y decisiones/recibos/excepciones. |
| deadlines/*.md | Recibo único por tipo, clave y plazo; efecto y hora evaluada. |
| meta/config.md, meta/agents, meta/tasks, meta/sessions | Configuración remota, contadores y sesiones declaradas. |
| meta/decisions/*.md | Apertura, clase, opción, autorización y resultado de plazo. |
| reviews/ID.md, roles/reviewers/*.md | Aprobación por SHA y elegibilidad registrada. |
| queue/ID.md, queue/merge-lock.md | Cola duradera, motivo humano y lock con token/lease. |

Los estados son AVAILABLE, CLAIMED, BLOCKED, REVIEW, INTEGRATED, CANCELLED. AVAILABLE también es implícito antes del primer claim. Sólo un claim publicado autoriza editar sus rutas.
Por qué: el remoto conserva una fuente de verdad independiente de las ramas de código.

## Comandos

Todos se invocan con `bash scripts/hack`.

| Comando | Efecto / límite |
|---|---|
| next | Tick automático; tarea propia o candidata por prioridad/dependencias/traslapes/autorización; hasta 15 líneas; R35 si ninguna. Recomienda, no reserva. |
| status [--task ID --summary] | Tick automático, estado remoto, presupuesto en una línea y reloj; summary emite Read-token actual. |
| tick | Evalúa backlog 600 s, decisiones 900 s, leases, freeze y cola; recibo CAS único. No espera ni concede permisos sensibles. |
| claim ID --branch RAMA --worktree RUTA [--next TEXTO] | Exige rama/worktree separado existente y del mismo repo; gates de alcance, dueño, dependencia, autorización, freeze y checkpoint. |
| heartbeat ID | Tick automático + renueva lease del dueño y cuenta evento. |
| release ID [--cancel MOTIVO] | Libera reserva propia; conserva resumen, historial y estado AVAILABLE/CANCELLED. |
| release ID --expired --read-summary TOKEN | Recuperación ajena tras lease vencido y lectura actual; token cambia con claim/resumen. |
| log ID [--state CLAIMED\|BLOCKED] TEXTO | Evento corto; cambia sólo entre CLAIMED/BLOCKED y renueva lease. |
| checkpoint ID o --session --done TEXTO --decision TEXTO --why TEXTO --fails TEXTO --commands TEXTO --next TEXTO | Seis campos obligatorios, usa - si vacío; conserva historial y reinicia presupuesto. Registro propio liberado/integrado no recrea lease; --session guarda perfil propio sin necesitar tarea. |
| handoff ID | Resumen, sesiones observadas y pendiente; evento/lease si reservado, cierre sin recrear claim si integrado. |
| decision ID --option TEXTO --why TEXTO --reversible yes\|no --authorized yes\|no --class routine\|money\|accounts\|publish\|scope | Abre pendiente con hora; a 900 s una rutina autorizada actualiza Next/resumen y desbloquea sólo lease vigente. |
| done ID --pr URL --evidence TEXTO | Registra REVIEW y Task-Tip; URL/evidencia no son prueba de aprobación. |
| review ID --sha SHA --verdict approve\|reject | Identidad distinta y con claim activo o rol; exige SHA actual. Rechazo sustituye aprobación anterior. |
| register-reviewer NAME | HACK_HUMAN registra otra identidad; no se asigna rol propio. Identidad declarada, no autenticación criptográfica. |
| merge ID | Lock exclusivo con lease; aprobación SHA, base actual, scanner, smoke, Verify, alcance y R32; push atómico base+registro; falla a cola humana con una línea. |
| done ID --pr URL --evidence TEXTO --integrated COMMIT [--reviewer NAME] | Acredita integración externa por ancestry o árbol reconstruido y revisión actual; reviewer sólo debe coincidir con prueba, no la crea. |
| init-smoke --command COMANDO | Genera adaptador desde comando literal, lo ejecuta y guarda fingerprint; el gate reejecuta. Falla conserva PRODUCT_UNVERIFIED. |
| secret-exception ID --path RUTA --rule REGLA --reason TEXTO | Revisor elegible ajeno aprueba blob actual del índice dentro de la tarea; DECISIONS registra regla/ruta/hash, cambio invalida excepción. |
| digest | Agrupa revisión, bloqueos y decisiones para el humano. |
| lint [--secrets] | Presupuestos, PR de 5 líneas, estados/reservas e historial; --secrets ejecuta scanner propio y externos disponibles. |

## Revisión y merge

Modo claims: `HACK_AGENT=reviewer` ejecuta review después de inspeccionar código y correr su aceptación. Elegibilidad se verifica al crear la aprobación; no se invalida porque el revisor termine después su otra tarea. Un HEAD local nuevo distinto del remoto exige publicar primero. Modo gh: URL exacta github.com del remoto; API comprueba HEAD/base/rama, aprobación de cuenta distinta del autor y último voto decisivo vigente del SHA; solicitud actual de cambios bloquea. auto usa gh si disponible con PR github.com, si no claims.
Por qué: el argumento --reviewer nunca acredita revisión independiente.

merge valida la combinación de base actual y SHA aprobado sin reescribir ese SHA. Cambios fuera de Paths, contratos/tipos/migraciones/lockfiles/CI, configuración de permisos y validadores requieren humano. Los comandos de verificación deben salir 0 sin modificar archivos rastreados. El comando de aceptación sólo cubre los criterios que el proyecto implemente en él; no demuestra calidad ni rúbrica por sí solo.
Por qué: los gates verifican señales ejecutables y conservan sus propios límites.

Merge propio usa --no-ff. Registro externo soporta merge/FF por ancestry y squash/rebase sólo si reconstruir la integración sobre el padre produce exactamente el tree hash remoto. Conflicto, edición adicional o prueba ambigua dejan tarea pendiente. Requiere soporte de push --atomic y permisos para main/claims; protección que exige PR/CI puede impedir el merge directo y queda en cola humana. Detalles en MERGES.md.
Por qué: guardar un SHA no acredita contenido y publicar sólo la base perdería el registro.

## Presupuesto, recuperación y reloj

status imprime eventos desde checkpoint/umbral, total y eventos restantes. A 60/100 por defecto muestra CHECKPOINT AHORA y bloquea nuevos claims; checkpoint reinicia contador. HACK_SESSION cuenta únicamente sesiones declaradas; no mide tokens reales ni inferencia de compactación.
Por qué: un proxy honesto puede imponerse por código sin fingir contexto invisible.

tick deja REQUIRES_RECOVERY al vencer un claim y conserva reserva/resumen; recuperar sigue exigiendo lectura+token R21. Un lock de merge vencido sí se retira, con recibo y cola humana; su token impide al antiguo proceso publicar. SIGINT/TERM intenta liberar; SIGKILL o corte de red necesita lease y reconciliación.
Por qué: la continuidad tiene precedencia sobre robar una reserva abandonada.

status/next ante pérdida del remoto muestran SIN REMOTO: solo tests locales/ensayo/revisión local. No crean claims offline; al volver consultan remoto y tick sin copiar estado local. La deriva >60 s usa HTTP Date de GitHub o reloj remoto explícito en pruebas; sin Date se declara no comprobado, nunca usa fecha de commits como reloj remoto.
Por qué: particiones y relojes desconocidos no deben parecer coordinación segura.

## Transacciones y códigos

Cada comando trabaja en repositorio temporal. Push fast-forward serializa claims; ante contención fetch/rebase/reconstrucción revalida gates. Lecturas idempotentes no generan commits vacíos. Rutas/globs se normalizan conservadoramente; cada rama y worktree es exclusivo por tarea. Sin symlinks o nombres con coma para reservas.
Por qué: cuatro agentes comparten máquina sin compartir índices operativos.

| Código | Significado |
|---|---|
| 0 | Confirmado, lectura válida, lint verde; también lectura degradada explícita. |
| 1 | Git/remoto o lint falló; no hay claim confirmado. |
| 2 | Entrada/configuración inválida, o PRODUCT_UNVERIFIED del smoke completo. |
| 3 | Conflicto/gate denegado, incluyendo cola humana de merge. |
| Otro | init-smoke/gate conserva salida real del comando de producto. |

Activa el hook: `git config core.hooksPath .githooks`; conserva bit ejecutable con `chmod +x .githooks/pre-commit`. Patrones, falsos positivos y excepciones están en SECURITY.md. Cron/Action opcionales cada cinco minutos están en SCHEDULING.md; sin agente ni scheduler activo ningún plazo corre. Cron/Actions pueden retrasarse: son disparadores, no una garantía de tiempo real.
Por qué: documentar una herramienta no la instala ni mantiene viva.
