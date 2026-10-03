# Cuello → mecanismo

Carga esta guía al decidir prioridades, resolver bloqueos o integrar PRs. Por qué: sus gates no necesitan estar en el contexto de cada implementación.

| Cuello | Mecanismo | Evidencia reproducible |
|---|---|---|
| Aprobación del backlog | 10 min; sólo P0 en autonomía vigente sin respuesta | policy backlog en frontera 599/600 s y P0/P1 |
| Decisión de producto reversible | DECISIONS; 15 min; opción reversible autorizada y registro | policy decision en frontera 899/900 s |
| Credenciales, gastos o contradicción | BLOCKED sólo para acción afectada; otra tarea o mocks | gate restricted y claim independiente de tarea BLOCKED |
| Humano que revisa merges | Gates de autofusión; demás PR en cola y un digest | policy merge y digest de varias tareas REVIEW |
| Dos merges simultáneos | Cola exclusiva secuencial; smoke y aprobación del SHA vigente | policy merge rechaza cola no exclusiva o evidencia vieja |
| Claim concurrente | Push fast-forward; fetch, rebase, recalcular y retry | cuatro procesos, una tarea; cuatro tareas disjuntas |
| Archivos compartidos | Traslapes conservadores y dueño explícito en OWNERS | carrera por dos tareas con el mismo archivo |
| Agente desaparecido | Lease 30 min; leer resumen y token antes de liberar | vencimiento, token inválido y recuperación |
| Único setup/contrato | Contrato/mock inicial mínimo; spikes y skeleton paralelos | ejemplo HACK-001/002/003 sin dependencia serial |
| No hay tareas disponibles | Revisar PR → tests → demo → ensayo | policy idle para las cuatro rutas |
| Git remoto no disponible | No nuevos claims offline; validación local, checkpoint local y ensayo | fallo de remoto sin claim fantasma; no se verifica caída de GitHub real |
| Fin de sesión | Checkpoint, handoff y resumen de ≤15 líneas | lectura fría de una sesión sin historial |
| Fin del tiempo | Feature freeze, línea de corte y video de respaldo | policy freeze en frontera; checklist de ensayo limpio |

## Evaluador de políticas

Usa `bash scripts/policy` para hacer la regla revisable; pasa hechos comprobados, no suposiciones. Por qué: el evaluador decide elegibilidad, pero no observa GitHub ni otorga permisos.
Interpreta código 0 como gate satisfecho, 3 como diferido y 2 como entrada inválida; ante 3 sigue otra tarea. Por qué: esperar aprobación nunca implica detener todo el equipo.

```bash
bash scripts/policy backlog 600 no P0 yes
bash scripts/policy decision 900 no yes yes
bash scripts/policy merge yes yes yes author reviewer yes no yes yes
bash scripts/policy idle no yes no
bash scripts/policy freeze 2000 2000
```

| Comando | Argumentos en orden | Por qué |
|---|---|---|
| backlog | segundos desde solicitud, aprobado, prioridad, autonomía; flags yes/no | Aplica el fallback únicamente dentro de límites humanos. |
| decision | segundos desde pregunta, respondida, reversible, autorizada; flags yes/no | El timeout no habilita dinero, cuentas ni cambio de alcance. |
| merge | autorizado, smoke, criterios, autor, revisor, dentro de alcance, toca protegidos, evidencia vigente, cola exclusiva | Requiere todos los gates; protegido incluye contratos, CI y secretos. |
| idle | PRs pendientes, tests pendientes, pulido demo pendiente | El primer trabajo pendiente gana; sin los tres, ensaya. |
| freeze | epoch actual, epoch de freeze | Hace comprobable la frontera sin depender del huso de la máquina. |

## Cola de integración

En GitHub habilita merge queue o un único job de integración con `concurrency` y `cancel-in-progress: false`; documenta esa configuración en HACKATHON.md. Por qué: un lease de tarea no serializa merges del repositorio.
Si no hay cola exclusiva verificada, el gate `EXCLUSIVE_QUEUE=no` deriva a la cola humana y el agente continúa. Por qué: un archivo local no coordina integraciones remotas.
Antes de cada merge comprueba el SHA actual, aprobación independiente, diff real, smoke del producto contra la base vigente y aceptación. Por qué: la evidencia de un commit anterior caduca al cambiar PR o base.
No marques INTEGRATED con un URL o un smoke supuesto; registra commit y prueba de merge real según docs/CLI.md. Por qué: cerrar una reserva debe corresponder a integración comprobable.
Si no hay tareas libres, no quites reservas ajenas activas para generar trabajo; aplica `policy idle`. Por qué: la ociosidad no justifica perder aislamiento.
