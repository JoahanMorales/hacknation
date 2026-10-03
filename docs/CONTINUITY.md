# Continuidad y contexto mínimo

Cargar este documento al reiniciar una sesión, llegar a compactación, preparar handoff o recuperar un lease vencido. Por qué: la recuperación necesita un protocolo breve que no dependa del historial del chat.

## Arranque en frío, menos de 60 segundos de orientación

1. Leer `AGENTS.md` una vez por sesión y conservar sus reglas en contexto. Por qué: el núcleo establece autoridad, reservas y verificación sin recorrer todo el repo.
2. Ejecutar `bash scripts/hack next`; devuelve tarea/candidata y resumen vigente. Por qué: el estado y el resumen vivo ya contienen trabajo, bloqueos y siguiente paso.
3. Enunciar ID, rama, worktree y siguiente paso exacto usando el resumen. Por qué: comprobar la comprensión antes de editar evita retomar el punto equivocado.
4. Leer sólo la sección de la tarea, las decisiones vigentes que afecta y archivos necesarios; usar `git log --oneline -20` y `git diff --stat`. Por qué: el historial reciente y el tamaño del diff orientan sin duplicar contexto.
5. Confirmar la reserva vigente o reclamar la tarea antes de editar y renovar heartbeat. Por qué: retomar una sesión no equivale a conservar un lease activo.

No releer el repositorio ni hacer `cat` de archivos completos; usar rangos, `rg`, `grep` y `git diff --stat`, con la excepción de la lectura inicial del núcleo compacto. Por qué: el contexto limitado debe contener decisiones y trabajo pendiente, no información repetida.

## Carga bajo demanda

| Documento | Cuándo cargarlo | Intención |
|---|---|---|
| `HACKATHON.md` | Planificar, cambiar autonomía o comprobar freeze / entrega | Por qué: las restricciones del evento sólo se necesitan al decidir alcance. |
| `IDEA.md` | Planificar o resolver una duda del objetivo de producto | Por qué: la tarea concreta ya contiene su objetivo verificable. |
| `TASKS.md`, sección de tarea | Reclamar, revisar aceptación o estimar dependencia | Por qué: el backlog completo no cabe siempre en contexto. |
| `OWNERS.md` | Reclamar o cambiar rutas compartidas | Por qué: la propiedad debe comprobarse antes de editar recursos centrales. |
| `docs/CLI.md` | Primera vez que se usa un comando u opción | Por qué: la interfaz exacta evita improvisar flags. |
| `docs/PLAYBOOK.md` | Planificar, revisar, integrar o cerrar demo | Por qué: esas fases requieren condiciones que no usa cada edición. |
| `docs/ANTI-BOTTLENECKS.md` | Evaluar timeouts, gates de merge o exclusividad de la cola | Por qué: las políticas tienen pruebas y una interfaz exacta. |
| `docs/SECURITY.md` | Introducir dependencias, activos, comandos externos o revisar secretos | Por qué: el material externo y los datos necesitan límites específicos. |
| `WHY.md` | Una regla es ambigua o parece impedir un resultado autorizado | Por qué: su explicación extendida ayuda a aplicar intención sin cargarla por defecto. |
| `DECISIONS.md` en `claims` | La tarea depende de una decisión vigente | Por qué: es el canal autoritativo de bloqueos y decisiones. |

## Snapshot y bitácora

`STATE.md` se genera y sobrescribe en la rama `claims`: fase, tareas por estado, quién tiene qué, bloqueos, decisiones vigentes y siguiente paso global. Cada registro durable y bitácora usa `AVAILABLE`, `CLAIMED`, `BLOCKED`, `REVIEW`, `INTEGRATED` o `CANCELLED`.

Mantener `STATE.md` en un máximo de 60 líneas y 700 palabras y el núcleo en 150 líneas y 1800 palabras; comprobar con `bash scripts/hack lint`. Por qué: un snapshot excesivo deja de servir como entrada rápida.

Mantener arriba de cada bitácora un `Resumen vivo` de máximo 15 líneas con hecho, decisiones y porqué, fallos, comandos y siguiente paso exacto; `status --task --summary` añade tarea, rama y worktree vigentes. Por qué: la siguiente sesión debe reanudar sin reconstruir el historial.

Conservar debajo el historial append-only y entradas de una sola línea, con ID automático de bitácora y hora, estado y agente por evento. Por qué: el resumen puede cambiar sin borrar evidencia previa.

No editar localmente `STATE.md`, `DECISIONS.md` ni bitácoras para publicar estado; usar `bash scripts/hack` y consultar la rama `claims`. Por qué: esos datos deben ser visibles sin fusionar la rama de código.

## Checkpoint

Ejecutar checkpoint tras cada criterio cumplido, antes de un comando largo, cerca del 60 % del contexto y antes de terminar la sesión. Por qué: perder una sesión no debe perder el punto exacto de reanudación.

```bash
bash scripts/hack checkpoint HACK-001 \
  --done 'Criterio 1 validado; commit abc1234' \
  --decision 'Usar mock local hasta terminar el spike' \
  --why 'Permite mostrar el recorrido mientras se valida la API' \
  --fails 'Ninguno' \
  --commands 'scripts/smoke' \
  --next 'Ejecutar scripts/smoke y publicar evidencia del criterio 2'
```

Registrar resultados reales y comandos exactos, indicando `no ejecutado` cuando aplique. Por qué: el resumen debe distinguir evidencia de intención.

Para un bloqueo, registrar la decisión/pregunta con checkpoint y luego `bash scripts/hack log HACK-001 --state BLOCKED 'Falta acceso; fallback pendiente; continuar HACK-003'`. Por qué: pregunta, estado y trabajo independiente deben ser visibles para todos.

## Al compactar

| Conservar | Descartar del contexto del chat |
|---|---|
| ID de tarea, rama y worktree | Salidas largas de comandos |
| Siguiente paso exacto | Exploraciones descartadas |
| Decisiones vigentes y su porqué | Código ya commiteado |
| Tests fallando y comandos de validación | Lecturas repetidas y explicaciones ya guardadas |
| Estado de claim y lease | Conversación sin una decisión vigente |

Conservar los datos de la columna izquierda mediante checkpoint y descartarlos de la derecha sólo del contexto, sin borrar archivos ni historial. Por qué: compactar contexto no autoriza destruir evidencia o trabajo.

## Handoff y cierre de sesión

1. Guardar el trabajo de código en la rama de la tarea y registrar el commit o cambios pendientes. Por qué: el resumen debe señalar dónde está el trabajo recuperable.
2. Ejecutar checkpoint con el siguiente paso exacto y `bash scripts/hack handoff HACK-001`. Por qué: el traspaso reúne el mínimo que necesita otra sesión.
3. Si habrá pausa larga, liberar el claim propio con `bash scripts/hack release HACK-001`; si seguirá pronto, conservar el lease y renovar heartbeat. Por qué: reservas abandonadas reducen el paralelismo disponible.
4. Si se entrega a revisión, usar `bash scripts/hack done HACK-001 --pr '<URL>' --evidence '<criterios, comandos y resultados>'`; queda `REVIEW`. Por qué: abrir un PR no significa que el trabajo esté integrado.

## Recuperar un lease vencido

```bash
bash scripts/hack status --task HACK-001 --summary
# Leer el Resumen vivo y el token emitido; sustituir TOKEN en la línea siguiente.
bash scripts/hack release HACK-001 --expired --read-summary TOKEN
# Sustituir RECOVERY_REF por el commit/rama recuperado tras inspeccionar el worktree previo.
RECOVERY_REF=feat/hack-001-anterior
git worktree add -b feat/hack-001-retomar ../wt-hack-001-retomar "$RECOVERY_REF"
bash scripts/hack claim HACK-001 --branch feat/hack-001-retomar --worktree ../wt-hack-001-retomar
```

Inspeccionar commits y cambios del worktree previo antes de trasladar trabajo; no borrar ni sobrescribir el trabajo ajeno. Por qué: expirar una reserva concede trabajo futuro, no propiedad sobre archivos ya creados por otra persona.

Omitir --next al recuperar para conservar el siguiente paso exacto del checkpoint; cambiarlo sólo por una acción igualmente concreta. Por qué: un mensaje genérico de retomar pierde la continuidad.

El token confirma que se leyó el resumen de la revisión observada; si el estado cambió, volver a leer antes de liberar. Por qué: la recuperación no debe usar información obsoleta.

El umbral de eventos de v2.1 exige checkpoint antes de claims nuevos. HACK_SESSION distingue sesiones declaradas; handoff incluye su cuenta y pendiente. No se infieren tokens reales ni compactaciones. Por qué: el siguiente agente recibe continuidad medible sin promesas sobre contexto invisible.
