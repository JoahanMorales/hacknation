# Plazos automáticos y configuración

`hack tick` consulta la configuración de `HACKATHON.md` en la base **remota**, evalúa backlog (600 s), decisiones (900 s), leases, freeze y el lease del lock de merge. Publica cada efecto y su receipt en un único commit de `claims`. Dos procesos concurrentes recalculan contra la rama vigente: una combinación tipo/clave/plazo se publica una sola vez. Por qué: el receipt y el efecto se confirman juntos mediante el mismo push CAS.

`status`, `heartbeat` y `next` llaman tick automáticamente. TASKS.md y OWNERS.md se consultan también en la base remota; next y claim ven prioridades, tareas nuevas y dueños publicados aunque el worktree conserve un snapshot anterior. Una lectura sin plazo o configuración nuevos no añade commits ni eventos. Por qué: un agente activo dispara el trabajo pendiente sin cargar el historial en contexto.

## Configuración explícita

Añada estas líneas sin bullets ni comillas a `HACKATHON.md`, revise sus autorizaciones y publique el archivo en la base. El CLI no interpreta frases de autorización dispersas en Markdown. Por qué: un gate necesita valores inequívocos y no puede inferir permisos humanos.

```text
Backlog-Proposed-Epoch: 0
Backlog-Approved: no
Autonomy: no
Auto-Merge: no
Freeze-Epoch: 0
Events-Per-Session: 100
Checkpoint-Percent: 60
Review-Mode: auto
Merge-Lease-Seconds: 1800
Merge-Wait-Seconds: 180
```

`0` en `Backlog-Proposed-Epoch` inicia el plazo en el primer tick; un epoch explícito inicia una nueva propuesta. `Backlog-Approved: yes` permite las prioridades aprobadas, pero sigue exigiendo `Autonomy: yes`. Después de 600 s sin aprobar, sólo P0 con autonomía explícita puede reclamarse. La falta de configuración significa **sin autonomía y sin autofusión**. Una modificación local de HACKATHON no habilita permisos. Por qué: el silencio ni los relojes cambian la autoridad.

`Freeze-Epoch: 0` desactiva el plazo de freeze hasta configurar su epoch. Después del freeze, un nuevo claim necesita `Freeze-Allowed: yes` en su sección de TASKS y la autonomía aplicable; ese campo se reserva para fixes de demo, seguridad, documentación, ensayo y entrega. Por qué: el marcador hace comprobable la clasificación del backlog, cuya corrección corresponde a quien lo aprueba.

Los receipts están en `deadlines/`; las decisiones pendientes, en `meta/decisions/`; los contadores, en `meta/agents/`, `meta/tasks/`, `meta/sessions/` y `meta/task-sessions/`. Cada uno pertenece a la rama `claims`. Por qué: las lecturas del estado proceden de una única historia remota.

## Decisiones y recuperación

```bash
HACK_AGENT=agent-1 bash scripts/hack decision HACK-001 \
  --option 'Usar datos sintéticos etiquetados' --why 'API no disponible' \
  --reversible yes --authorized yes --class routine
```

Tick registra la opción reversible a los 900 s sólo si sigue existiendo `Autonomy: yes`, `Authorized: yes`, `Reversible: yes` y `Class: routine`. Si conserva la reserva del dueño que abrió la petición, actualiza Next y el Resumen vivo; una tarea BLOCKED con lease vigente pasa a CLAIMED. Si el lease ya venció, mantiene el estado y exige recuperación con token antes de aplicar la opción. Añade un evento de scheduler a la tarea, sin consumir el presupuesto del agente que llamó tick. Si la reserva fue liberada o cambió de dueño, conserva el resultado en DECISIONS sin sobreescribir el siguiente paso de otra sesión. Las clases `money`, `accounts`, `publish` y `scope` quedan bloqueadas aunque alguien pase `--authorized yes`. El comando registra una declaración para un trabajo cooperativo; no puede verificar el entendimiento semántico de la autoridad o del alcance. Por qué: los permisos de R04 siempre requieren su autorización explícita aplicable y jamás nacen de un timeout.

Un lease vencido genera `REQUIRES_RECOVERY` automáticamente y **conserva** reserva, Resumen vivo y Read-token. El siguiente ejecutor lee `status --task ID --summary` y recupera con `release --expired --read-summary TOKEN`; un heartbeat/checkpoint válido del dueño invalida un token viejo. Tick no borra archivos ni libera a ciegas una reserva que podría seguir ejecutando un proceso largo. Por qué: cumplir R21 evita que un reloj adelantado haga pisar trabajo vivo.

El lock de merge tiene recuperación automática al vencer: se registra el motivo, se manda la entrada de cola a humano y se retira el lock. La implementación de merge comprueba su token antes de publicar base/claims. Por qué: un proceso antiguo no debe usar un lock recuperado para fusionar.

## Ejecución cada cinco minutos

En una máquina encendida, configure su cron con ruta absoluta, remoto accesible y credenciales Git disponibles sin interacción:

```cron
*/5 * * * * cd /ruta/absoluta/al/repositorio && HACK_AGENT=scheduler HACK_REMOTE=origin HACK_BASE=main bash scripts/hack tick >> /ruta/absoluta/hack-tick.log 2>&1
```

El archivo `workflows/hack-tick.yml.example` es opcional y está inactivo. Copiarlo a `.github/workflows/hack-tick.yml` en la rama por defecto habilita schedule cada cinco minutos y disparo manual; ajuste la base si no se llama main. Su token necesita permiso de escritura sobre `claims`; el helper temporal del runner proporciona ese token también a las transacciones Git del CLI. Revise cualquier protección del remoto que pueda impedir el push. Por qué: el repositorio portable no activa infraestructura ni modifica permisos por sí solo. El ejemplo usa la versión publicada en la [documentación de checkout](https://github.com/actions/checkout).

**Límite:** sin agente, cron ni Action activos, nada corre. El siguiente tick procesa plazos vencidos; no existe un proceso interno que se despierte por sí solo. Cron depende de la máquina y Actions puede retrasarse o descartar un job bajo carga; cinco minutos es la frecuencia solicitada, no una garantía de latencia. GitHub también desactiva schedules públicos tras 60 días sin actividad. Estas configuraciones se entregan como ejemplos; la evidencia local no prueba el servicio real. Por qué: un paquete de comandos no puede prometer disponibilidad de un scheduler externo. Consulte los [límites oficiales de schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Presupuesto y reloj

`Events-Per-Session` define el presupuesto de **eventos de coordinación**, con alerta al porcentaje configurado. `status` informa eventos desde el último checkpoint, umbral, total y eventos restantes para checkpoint. Al alcanzar el umbral, `claim` exige un checkpoint reciente; las tareas vigentes, el checkpoint y el handoff siguen disponibles. Por qué: el gate conserva continuidad sin medir tokens privados del proveedor.

Si su último evento cerró o liberó una tarea, puede hacer checkpoint de su registro propio sin recrear el claim. Si es revisor con rol y no tiene tarea propia, use `hack checkpoint --session` con los mismos seis campos (`--done`, `--decision`, `--why`, `--fails`, `--commands`, `--next`). Guarda su perfil en `meta/profiles/`, reinicia su presupuesto y no cambia tareas ajenas ni crea reservas. Por qué: el presupuesto no debe exigir un claim que él mismo está bloqueando.

Defina un `HACK_SESSION` estable y nuevo por sesión real; identifica inicio, eventos y checkpoints. Si falta, se usa `stable` por agente: es una sesión observada y no un conteo de compactaciones o chats del modelo. El CLI no ve esos datos. Cada tarea registra cuántas combinaciones agente/sesión participaron; handoff muestra ese contador y su pendiente. Por qué: medir señales explícitas evita inventar sesiones.

`status` compara el reloj local con el encabezado Date de la API GitHub cuando existe `gh` y el remoto pertenece a GitHub. Una diferencia mayor a 60 s imprime `CLOCK_SKEW`; sin Date declara el reloj remoto no comprobado. Los commits no sirven como reloj actual. La medición incluye resolución del encabezado y latencia de red; no sustituye NTP. Por qué: el cálculo de leases depende de relojes sincronizados.

`HACK_NOW` simula epoch para pruebas y no se compara con hora real; `HACK_REMOTE_NOW` simula el reloj remoto. No configure ninguna en operación real. Por qué: las pruebas de frontera deben ser reproducibles sin esperar 30 minutos.

Si el remoto no responde, `status` devuelve `SIN REMOTO: solo tests locales/ensayo/revisión local` y no crea claims. Cuando vuelve, la siguiente lectura obtiene `claims` vigente y ejecuta tick; no hay una reserva offline que reconciliar o convertir en dueña. Por qué: la continuidad local no debe inventar coordinación remota.
