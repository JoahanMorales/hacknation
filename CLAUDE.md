# Instrucciones compartidas

@AGENTS.md

Carga `docs/` sólo cuando lo indique `AGENTS.md` o la fase de trabajo. Por qué: el contexto mínimo conserva tokens para ejecutar la tarea.

## Sólo Claude Code

- El hook `SessionStart` ya ejecutó `bash scripts/hack next`; no lo repitas salvo que cambie el estado. Por qué: ahorra un turno por sesión.
- El hook `PostToolUse` envía heartbeat cada 8 min y revisa tu inbox cada ~2 min; los mensajes nuevos llegan como contexto adicional: atiéndelos (R54–R59) antes de seguir. Aun así haz checkpoint (R36).
- El hook `Stop` no te deja terminar con mensajes sin atender: responde con `hack msg` y `hack inbox --ack`.
- Comandos: `/hack-setup` (humano, inicio del evento), `/hack-plan` (planificador), `/hack-start`, `/hack-ship`, `/hack-review`, `/hack-handoff`, `/hack-demo`. Por qué: cada fase tiene un guion probado.
- Usa subagentes `Explore` para búsquedas amplias y conserva tu contexto para implementar. Por qué: R39.
