# hacknation

Repositorio del equipo para el hackatón: 3–4 personas, cada una con 1–2 agentes (Claude Code, Cursor o Codex) trabajando en paralelo sobre **Python + FastAPI**. Incluye el protocolo de coordinación *Hackathon Agent Config v2.1*, revisado y adaptado para ir rápido.

## Cómo funciona en 30 segundos

- **AGENTS.md** es el núcleo que leen todas las herramientas: `CLAUDE.md` lo importa y `.cursor/rules/` lo aplica siempre.
- **TASKS.md** es el backlog estático. El estado vive en la rama remota `claims` y se maneja sólo con `bash scripts/hack`.
- Cada tarea tiene su rama y su worktree. `bash scripts/wt new HACK-NNN --agent ana-1` crea ambos, escribe la identidad y hace el claim en un solo paso.
- El merge es automático cuando se cumplen todas las condiciones (`hack merge`): revisión de otro agente sobre el SHA, smoke del producto, el comando de "Cómo verificar" y un diff dentro de su alcance. Lo que no pasa va a la cola humana (`hack digest`).

## El día del evento

| Minuto | Quién | Qué |
|---|---|---|
| 0 | Humano responsable + Claude | `/hack-setup`: horas, rubric, reglas y freeze en HACKATHON.md, más hook de secretos |
| 5 | Planificador | Llenar IDEA.md, luego `/hack-plan`: TASKS.md + OWNERS.md, aprobación y push a main |
| 15 | Todos | `/hack-start` en el checkout principal; cada quien abre su agente en el worktree que imprime |
| … | Ejecutores | Ciclo `/hack-start` → implementar → `/hack-ship` → `/hack-review` de otro → `/hack-handoff` |
| freeze | Rol demo | `/hack-demo`: ensayo limpio, video plan B, checklist y submission |

En Cursor o Codex, estos guiones se leen en `.claude/commands/hack-*.md`.

## Setup por máquina (una vez, antes del evento)

```bash
git clone git@github.com:JoahanMorales/hacknation.git && cd hacknation
```

```bash
git config core.hooksPath .githooks
```

```bash
bash scripts/smoke --package-only
```

Requisitos: Git, Bash, Python 3.8+ (sólo para las pruebas del paquete), [uv](https://docs.astral.sh/uv/) y `gh` autenticado. El último comando tarda unos minutos y debe terminar en `PACKAGE_PASS`.

## Qué cambió respecto al zip v2.1

| Cambio | Por qué |
|---|---|
| `scripts/smoke` ya no corre la suite del paquete por defecto (usa `--package-only` o `--full`) | `hack merge` ejecuta el smoke en cada integración y la suite tarda minutos sin probar el producto |
| Nuevo `scripts/wt`: rama + worktree + `.hack-env` + claim en un comando | El ritual manual de 4 comandos con flags era el error más común |
| `scripts/hack` carga la identidad desde `.hack-env` del worktree | Ya no hay que exportar variables en cada terminal |
| Hooks de Claude Code: `hack next` al iniciar sesión y heartbeat automático cada 8 min | Un agente que olvida el heartbeat pierde el lease de 30 min con trabajo vivo |
| `.claude/settings.json` con permisos permitidos y denegados | Menos prompts, y force-push, `reset --hard` y `clean -fdx` bloqueados de verdad |
| Comandos `/hack-setup`, `/hack-plan`, `/hack-start`, `/hack-ship`, `/hack-review`, `/hack-handoff`, `/hack-demo` | Cada fase tiene un guion fijo |
| Regla para Cursor y CLAUDE.md con `@AGENTS.md` | Las tres herramientas usan el mismo núcleo |
| `docs/STACK.md`: FastAPI con routers autodescubiertos | Cuatro agentes no editan el mismo `main.py` |
| HACKATHON.md preconfigurado: `Autonomy: yes`, `Auto-Merge: yes`, `Review-Mode: claims` | Con `gh`, los agentes de una misma persona no pueden aprobarse (comparten cuenta) |
| Reglas R49–R53 de velocidad en AGENTS.md | Mock primero, PR temprano, sin preguntas evitables y máximo 20 min atascado |
| Se quitaron `evidence/`, `MANIFEST.sha256`, `VERIFICATION.md` y `HACKATHON-AGENTS.md` | Eran reportes de la verificación original y un shim de v1; el CLI no los usa |

## Límites conocidos

- `hack merge` hace `git push --atomic` directo a `main`. Si activas protección de rama que exige PR o CI en GitHub, esos merges caen a la cola humana.
- Cursor y Codex no tienen hook de heartbeat: el agente debe correr `bash scripts/hack heartbeat ID` cada ~10 min.
- Los plazos (backlog a 10 min, decisiones a 15 min, freeze) se evalúan en cada `status`/`next`/`heartbeat`. Para un tick periódico sin agentes, consulta `docs/SCHEDULING.md`.

## Mapa de documentos

`AGENTS.md` (núcleo) · `HACKATHON.md` (evento) · `IDEA.template.md` · `TASKS.template.md` · `OWNERS.md` · `docs/PLAYBOOK.md` (planificar, integrar y cerrar) · `docs/CLI.md` (flags) · `docs/CONTINUITY.md` (retomar) · `docs/SECURITY.md` · `docs/MERGES.md` · `docs/SCHEDULING.md` · `docs/STACK.md` · `WHY.md` (razón de cada regla) · `examples/` (backlog de ejemplo y `dry_run.py`).
