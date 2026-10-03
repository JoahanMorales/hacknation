# Instrucciones compartidas

@AGENTS.md

Carga `docs/` sólo cuando lo indique `AGENTS.md` o la fase de trabajo. Por qué: el contexto mínimo conserva tokens para ejecutar la tarea.

## Sólo Claude Code

- El hook `SessionStart` ya ejecutó `bash scripts/hack next`; no lo repitas salvo que cambie el estado. Por qué: ahorra un turno por sesión.
- El hook `PostToolUse` envía heartbeat cada 8 min y revisa tu inbox cada ~2 min; los mensajes nuevos llegan como contexto adicional: atiéndelos (R54–R59) antes de seguir. Aun así haz checkpoint (R36).
- El hook `Stop` no te deja terminar con mensajes sin atender: responde con `hack msg` y `hack inbox --ack`.
- Comandos: `/hack-setup` (humano, inicio del evento), `/hack-plan` (planificador), `/hack-start`, `/hack-ship`, `/hack-review`, `/hack-handoff`, `/hack-demo`. Por qué: cada fase tiene un guion probado.
- Contexto aislado: `Explore` para búsquedas amplias, `hack-runner` (Haiku) para tests/smoke/app, `hack-reviewer` (Sonnet) para revisiones. Sólo vuelve un resumen. Por qué: R39.
- Tests y builds siempre con `bash scripts/q ...`; pytest con `-q --tb=short -x`. Lee archivos por rangos y edita con Edit, no reescribas archivos enteros.
- Una tarea = una sesión. Al cerrar una tarea: `/hack-handoff` y `/clear` antes de la siguiente; no arrastres contexto viejo.
- No edites AGENTS.md ni CLAUDE.md durante el evento: invalidan la caché de prompt de todos los agentes.

## Al compactar

Conserva sólo: ID, rama, worktree, siguiente paso exacto, criterios pendientes, fallos con su error exacto, comandos de verificación, decisiones y mensajes del inbox sin responder. Descarta salidas de comandos, diffs y exploraciones.
