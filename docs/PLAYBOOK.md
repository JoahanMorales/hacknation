# Playbook de coordinación

Cargar este documento sólo al planificar, revisar o integrar, al resolver traslapes o al cerrar la demo. Por qué: el núcleo permite arrancar rápido y el detalle sólo aporta valor cuando toca esa fase.

## Roles y olas

| Rol | Responsabilidad | Regla e intención |
|---|---|---|
| Planificador | Idea, rubric, riesgos, contratos y backlog | Publicar incrementos verticales con criterios y archivos concretos. Por qué: cada agente necesita una unidad verificable de trabajo. |
| Ejecutor | Claim, implementación, smoke, evidencia y handoff | Trabajar en rama y worktree propios después del claim. Por qué: la reserva y el aislamiento evitan ediciones concurrentes. |
| Revisor | Verificar PR ajeno y criterios | Aprobar sólo evidencia reproducible; nunca aprobar el propio cambio. Por qué: la comprobación independiente descubre errores del autor. |
| Agente de demo | Walking skeleton, datos, wow, ensayo y video | Mantener el recorrido integrado y preparar plan B. Por qué: la competencia evalúa lo que puede mostrarse. |

Rotar roles cuando una tarea termina o se bloquea y reservar implementación mediante claim incluso para mejoras descubiertas al revisar. Por qué: un rol no debe monopolizar la integración ni saltarse la protección de archivos.

1. Completar `HACKATHON.md` e `IDEA.md`; identificar rubric oficial, activos y riesgos. Por qué: planificar sobre restricciones comprobadas reduce retrabajo.
2. Publicar `TASKS.md` estático con spikes acotados, walking skeleton P0, preparación de contratos y otras tareas verticales disjuntas. Por qué: el backlog debe permitir distribuir trabajo verificable sin una dependencia serial universal.
3. Pedir revisión del backlog y registrar el momento en `DECISIONS.md`; tras 10 min sin respuesta, arrancar sólo P0 dentro de autonomía. Por qué: un humano ausente no impide el trabajo reversible autorizado.
4. Publicar y revisar contratos, esquemas y mocks mínimos, con dueños en `OWNERS.md`, antes de repartir la primera ola que los consume; reclamar una o varias tareas `contract` disjuntas si hace falta crearlos. Por qué: las interfaces estables permiten paralelizar consumidores y su preparación también requiere una reserva.
5. Ejecutar spikes antes de integrar dependencias reales, usando mocks en trabajos paralelos. Por qué: la incertidumbre queda aislada y no detiene a los consumidores.
6. Aplicar P0 antes de P1 y P2; al freeze aceptar sólo arreglos de demo, seguridad y entrega. Por qué: la estabilidad del recorrido necesita tiempo reservado.

## Contratos, propiedad y traslape

| Recurso | Regla | Intención |
|---|---|---|
| Lockfiles | Asignar un dueño por patrón en `OWNERS.md`; solicitarle cambios de dependencias. | Por qué: regeneraciones simultáneas producen diffs incompatibles. |
| Migraciones | Reservar directorio/patrón para una tarea dueña; serializar nuevas migraciones. | Por qué: el orden y el esquema afectan a todos los consumidores. |
| Tipos compartidos / contratos | Publicar versión inicial antes de la ola y asignar dueño único. | Por qué: una interfaz cambiante invalida el trabajo paralelo. |
| CI | Asignar dueño y enviar cambios a revisión humana. | Por qué: las verificaciones de todos dependen de esa configuración. |
| Archivos probables | No reclamar si coinciden con otro claim activo; ampliar la reserva antes de editar fuera del alcance declarado. | Por qué: rutas, directorios y globs deben proteger el diff real. |

Mantener un solo dueño por recurso concreto, con filas `| patrón | HACK-NNN |` en `OWNERS.md`, y actualizar dueños mediante una revisión explícita. Por qué: los scripts necesitan una asignación inequívoca y los consumidores necesitan saber a quién pedir un cambio.

Tratar como protegidos `contracts/**`, esquemas, tipos compartidos declarados, `.github/workflows/**` y rutas de secretos; ajustar los patrones al proyecto. Por qué: el lugar del archivo no puede ocultar un cambio de contrato o de seguridad.

Resolver un cambio de contrato como una tarea propia con sus consumidores y criterios; no mezclarlo con una autofusión. Por qué: los cambios compartidos necesitan revisión de compatibilidad antes de llegar a todos.

## Fuente de verdad, estados y leases

La rama `claims` contiene `tasks/HACK-NNN.md` (estado durable), `claims/HACK-NNN.md` (reserva vigente), `worklog/WL-....md`, `STATE.md` y `DECISIONS.md`. `TASKS.md` describe el backlog, nunca el estado.

| Estado único | Significado en tarea y bitácora | Reserva |
|---|---|---|
| `AVAILABLE` | Se puede reclamar si dependencias, archivos y dueños lo permiten | Sin reserva |
| `CLAIMED` | Ejecución en curso | Lease activo |
| `BLOCKED` | Hay un impedimento registrado y un siguiente paso | Lease hasta liberar o expirar |
| `REVIEW` | PR y evidencia publicados; falta integración | Lease hasta integrar, liberar o expirar |
| `INTEGRATED` | Cambio revisado integrado | Sin reserva |
| `CANCELLED` | Tarea cerrada con motivo explícito | Sin reserva |

Usar sólo estos seis estados tanto en registros durables como en bitácoras. Por qué: `TERMINADA`, `PARCIAL` y estados similares duplican significado y rompen la lectura automática.

Mantener heartbeat cada 10 min y antes de un comando largo; el lease expira a los 30 min sin heartbeat. Por qué: una sesión desaparecida debe liberar capacidad sin perder su trabajo registrado.

Renovar el heartbeat durante los comandos que puedan superar 10 min, usando otra terminal del mismo agente. Por qué: un comando en ejecución no renueva automáticamente el lease.

Leer el resumen vivo emitido por `bash scripts/hack status --task HACK-NNN --summary` antes de liberar un lease vencido y pasar su token a `release --expired --read-summary`. Por qué: el reemplazo necesita conocer lo hecho y los comandos para no destruir ni repetir trabajo.

Ante un push de coordinación rechazado, hacer fetch, rebase y reintentar; abandonar ese intento sólo si ya existe `claims/HACK-NNN.md`. Por qué: una carrera en otra tarea no implica haber perdido la tarea elegida.

## Bloqueos y decisiones

| Situación | Acción | Intención |
|---|---|---|
| Decisión de producto o alternativa reversible | Registrar pregunta, hora, alternativa y motivo en `DECISIONS.md` usando checkpoint. | Por qué: un canal visible sustituye preguntas que sólo viven en el chat. |
| Sin respuesta en 15 min | Elegir alternativa reversible dentro del alcance autorizado, registrar decisión y seguir. | Por qué: un timeout desbloquea trabajo sin perder trazabilidad. |
| Dinero, cuentas, permisos, credenciales o ampliación de alcance | Mantener bloqueada esa acción hasta autorización explícita; continuar trabajo independiente. | Por qué: silencio y timeout no conceden autorización. |
| Contradicción con una autoridad superior | Registrar pregunta concreta y detener sólo el trabajo afectado. | Por qué: se conserva la jerarquía sin paralizar al equipo completo. |

Consultar y registrar decisiones vigentes sólo en `DECISIONS.md` de la rama `claims`, con referencias en `STATE.md` y en la bitácora. Por qué: una decisión no puede tener versiones simultáneas en varios chats o archivos locales.

## Revisión e integración

Abrir PRs pequeños tras rebase sobre la rama objetivo y validar el resultado rebased. Por qué: una revisión breve sobre una base reciente reduce conflictos y evidencia obsoleta.

Permitir autofusión sólo cuando se cumplan simultáneamente estas seis condiciones. Por qué: la autonomía de integración depende de evidencia y límites comprobables.

| # | Condición | Evidencia / intención |
|---:|---|---|
| 1 | `bash scripts/smoke` verde en el commit actual del PR | Por qué: la demo mínima sigue funcionando tras el cambio. |
| 2 | Todos los criterios de aceptación cumplidos y evidencia publicada | Por qué: pasar smoke no demuestra todo el objetivo de la tarea. |
| 3 | Agente revisor distinto del autor aprueba el diff actual | Por qué: el autor no constituye revisión independiente. |
| 4 | Todo el diff está dentro de `Archivos probables` declarados | Por qué: la revisión debe cubrir el alcance reservado. |
| 5 | No toca contratos, esquemas o tipos compartidos protegidos | Por qué: los consumidores requieren una revisión explícita de compatibilidad. |
| 6 | No toca CI ni secretos, ni introduce valores secretos | Por qué: el cambio no debe modificar su propia barrera de validación ni filtrar credenciales. |

Procesar integraciones en una cola secuencial y volver a comprobar las seis condiciones sobre la base actual antes de cada merge. Por qué: dos PRs válidos por separado pueden interferir si se fusionan a la vez.

Verificar una cola exclusiva de GitHub o un único integrador; si no hay exclusividad comprobada, pasar el PR a revisión humana, según `docs/ANTI-BOTTLENECKS.md`. Por qué: el claim de una tarea no serializa merges remotos.

Configurar `scripts/smoke-project` para la aplicación antes de aceptar su smoke; `bash scripts/smoke --package-only` sólo comprueba el paquete de coordinación. Por qué: la autofusión necesita validar el producto que se entregará.

Enviar a cola humana cualquier PR que no cumpla esas condiciones, tenga petición de cambios o validación fallida; el autor toma otra tarea libre o realiza trabajo ocioso útil. Por qué: la espera de una revisión no debe bloquear a todos los agentes.

Dar al humano un único `bash scripts/hack digest` por ronda de revisión acordada, incluyendo decisiones, bloqueos y PRs pendientes. Por qué: un resumen común evita cuatro interrupciones con la misma información.

Si no hay tareas libres, revisar PRs, comprobar tests, pulir la demo y ensayar, en ese orden; reclamar una tarea nueva antes de editar código. Por qué: la capacidad ociosa contribuye al cierre sin invadir reservas ajenas.

Usar la plantilla de PR de cinco líneas e incluir criterios, comandos, resultados, demo y deuda dentro de esas líneas. Por qué: el revisor recibe evidencia suficiente sin un segundo informe extenso.

## Cuello → mecanismo

| Cuello | Mecanismo | Verificación requerida |
|---|---|---|
| Aprobación del backlog | Timeout de 10 min, arranque sólo P0 autorizado | Agente elige P0 al vencer la ventana y conserva P1/P2 fuera |
| Decisión humana | `DECISIONS.md`, 15 min, opción reversible; otra tarea si necesita permisos | Pregunta y motivo registrados, tarea independiente continúa |
| Merges | Seis condiciones de autofusión, revisor distinto, cola secuencial | PR que toca contrato entra a cola; PR válido puede avanzar |
| Recurso compartido | Reserva por rutas y dueño en `OWNERS.md` | Un claim traslapado se rechaza y uno disjunto se acepta |
| Carrera de claims | Push atómico, fetch/rebase/reintento | Cuatro agentes disputan una tarea y sólo uno gana |
| Fin de sesión | Lease 30 min, resumen vivo y handoff | Otro agente lee resumen y retoma el siguiente paso exacto |
| Riesgo externo | Spike acotado y mocks para consumidores | Walking skeleton puede avanzar sin la API real |
| No hay tareas libres | Revisión, tests, pulido, ensayo | Agente produce evidencia útil sin editar reservas ajenas |
| Demo o red fallida | Video grabado y reproducido antes de entregar | Checklist de reproducción y ensayo; el paquete no ejecuta ni graba un video de producto |

Consultar `docs/ANTI-BOTTLENECKS.md` para la interfaz de gates y `bash scripts/smoke --package-only` para reejecutar las pruebas del paquete. Por qué: esta tabla describe qué comprobar y no sustituye la evidencia del ensayo real.

## Cierre

1. Aplicar feature freeze y revisar tareas `BLOCKED`, `REVIEW`, `CANCELLED` y límites conocidos. Por qué: el cierre requiere saber qué comportamiento está realmente integrado.
2. Clonar o crear checkout limpio, configurar variables desde `.env.example` sin secretos y ejecutar `bash scripts/smoke`. Por qué: el entorno de desarrollo puede ocultar dependencias o archivos sin commit.
3. Ensayar el recorrido cronometrado con datos etiquetados y grabar/reproducir el plan B. Por qué: una demo debe poder repetirse bajo el tiempo y las condiciones del evento.
4. Completar la checklist de `HACKATHON.md`, verificar acceso de jueces y preparar todos los enlaces. Por qué: un artefacto inaccesible no puede evaluarse.
5. Enviar submission mediante la persona autorizada y registrar comprobante, hora y versión. Por qué: preparar una entrega no demuestra que el evento la haya recibido.

## Ejecución verificable v2.1

Usa hack decision para abrir los plazos, hack review para aprobar un SHA desde una identidad elegible, y hack merge para la cola real y gates. policy permanece como evaluador puro de los 25 escenarios originales y no concede permisos ni ejecuta merges. Criterios quedan cubiertos hasta donde Cómo verificar los pruebe. Ver CLI.md, SCHEDULING.md y MERGES.md. Por qué: una declaración de gate verde no sustituye su ejecución.
