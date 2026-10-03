# Revisión e integración verificables

`done --reviewer nombre` no concede aprobación. Si se conserva ese argumento por compatibilidad, debe coincidir con el revisor que acredita la API o el archivo de revisión. `done --integrated COMMIT` comprueba además que el resultado existe en la base remota y contiene el trabajo aprobado.

## Dos modos de aprobación

`Review-Mode: auto` usa GitHub cuando el PR es de `github.com` y existe `gh`; en otro caso usa `claims`. Se puede fijar `Review-Mode: gh` o `claims` en HACKATHON.md. El modo `gh` falla cerrado ante errores de API, un remoto distinto del PR o un SHA/base/rama distinto de la tarea; no recurre silenciosamente al archivo local. Las cuentas de GitHub y las identidades HACK_AGENT son sistemas distintos: la independencia en GitHub se compara contra la cuenta autora del PR.

GitHub: se consultan el PR y todas las páginas de revisiones con `gh api --template`. Se toma la última revisión decisiva de cada cuenta, se exige `APPROVED` sobre el SHA actual y una cuenta distinta de la autora. Una última solicitud de cambios sobre ese SHA bloquea aunque otra cuenta haya aprobado. Las revisiones descartadas u obsoletas no habilitan integración. No hacen falta los binarios `jq` ni Python para el CLI. Fuentes: [revisiones REST](https://docs.github.com/en/rest/pulls/reviews) y [gh api](https://cli.github.com/manual/gh_api).

Sin gh: otra identidad ejecuta `HACK_AGENT=reviewer bash scripts/hack review HACK-001 --sha SHA --verdict approve`. El comando exige que HEAD local y remoto coincidan, que la identidad sea distinta de la dueña y que tenga un claim propio activo o un rol registrado por una persona humana. `HACK_AGENT=human HACK_HUMAN=human bash scripts/hack register-reviewer reviewer` registra el rol; el registrador no puede asignárselo a sí mismo. Una identidad cooperativa con permiso de escritura puede declarar HACK_HUMAN: este protocolo no autentica usuarios del sistema operativo.

El artefacto `reviews/ID.md` guarda SHA, veredicto, autor, revisor, momento y la prueba de elegibilidad que validó el comando. Terminar la tarea propia del revisor después de aprobar no invalida esa aprobación. Cambiar el SHA, rechazar o reemplazar la revisión sí la invalida. Aprobar sólo expresa revisión; no sustituye los gates de producto y aceptación.

## Cola y gates

`hack merge ID` exige REVIEW y un claim vigente propio. Registra WAITING, toma `queue/merge-lock.md` mediante actualización Git de claims y valida en un clon temporal una combinación de la base vigente y el TIP aprobado. La combinación usa `merge --no-ff --no-commit`, preserva el SHA revisado y evita que una reescritura invalide la aprobación de cuatro tareas disjuntas. Si resolver el conflicto requiere reescribir la rama, se exige nueva revisión del SHA resultante.

`Autonomy: yes` y `Auto-Merge: yes` en HACKATHON.md remoto son obligatorios; ningún timeout concede esos permisos. Se revalidan antes del candidato y justo antes de publicarlo. Tras Freeze-Epoch, una tarea ya en REVIEW también necesita `Freeze-Allowed: yes` en TASKS remoto; sólo se integran fixes de demo autorizados. Se ejecutan los gates de R32: aprobación actual, diff no vacío dentro de Archivos, ausencia de contratos/tipos/migraciones/CI/lockfiles y cambios al propio validador, escáner de secretos propio, `bash scripts/smoke` de producto y el comando exacto Cómo verificar. La aceptación automatizable es la que ese comando prueba: el CLI no interpreta criterios subjetivos. Si los tests cambian archivos rastreados o el índice del candidato, se requiere una revisión nueva.

El commit resultante y el estado INTEGRATED se publican juntos con `git push --atomic` hacia base y claims. La transacción vuelve a comprobar el lock, su lease, la base, el TIP y la aprobación. Así, un proceso con un lock vencido o robado no puede publicar una base sin su registro correspondiente. El remoto debe soportar atomic y permitir ambas actualizaciones; las protecciones que exijan la API de merge de GitHub pueden impedir este modo y quedan en cola humana.

Un gate rojo deja HUMAN y un motivo de una línea, sin publicar la base. La salida normal, el fallo y las señales INT/TERM intentan liberar siempre el lock. Si el proceso recibe SIGKILL o el remoto se cae durante la limpieza, la liberación inmediata es imposible; el lease y tick permiten recuperarlo después. `Merge-Lease-Seconds` y `Merge-Wait-Seconds` configuran esos límites. La cola no garantiza orden FIFO; sí exclusión y registro consistente. Un test que tarda más que el lease cancela su candidato.

## Squash/rebase externos

La cola propia crea merges `--no-ff`. `done --integrated COMMIT` también admite squash y rebase externos, incluso rebase de varios commits sobre trabajo disjunto. Se superponen todos los objetos, modos y borrados de los archivos que cambió la tarea sobre el árbol de `COMMIT^`; el tree hash del árbol completo debe coincidir exactamente con COMMIT. El commit resultante debe modificar al menos un archivo de la tarea; un paso parcial del rebase no acredita el contenido completo. La tarea conserva una aprobación sobre su TIP original. Cuando GitHub está activo, la API debe declarar `merged: true` y `merge_commit_sha` exactamente igual a COMMIT. No se envía una solicitud de merge mediante la API. [GitHub documenta ese resultado según el modo](https://docs.github.com/en/rest/pulls/pulls).

La prueba de árbol es conservadora: si la base cambió dentro de un archivo revisado y el resultado combina contenido diferente del TIP, se rechaza y se exige revisar la rama actualizada. Ausencia de objetos/historia, modos o contenido diferente también bloquean el registro; no se acepta una coincidencia parcial de archivos.

Las pruebas de merge utilizan remotos bare reales y cuatro procesos. Sus fixtures sustituyen smoke por un pequeño producto con gates ejecutables para evitar la recursión smoke → test merge → smoke. El CLI de producción no contiene un permiso para omitir smoke. Los tests del contrato gh simulan respuestas de API y no prueban un GitHub autenticado ni sus protecciones.
