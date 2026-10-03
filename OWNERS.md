# Dueños de recursos compartidos

Un solo escritor por recurso compartido; los demás piden cambios con `bash scripts/hack msg <ID> --kind request`. Por qué: lockfiles, contratos y archivos centrales no se mezclan bien entre agentes.

| Patrón | Tarea dueña |
|---|---|
| pyproject.toml | HACK-001 |
| uv.lock | HACK-001 |
| app/main.py | HACK-001 |
| app/config.py | HACK-001 |
| web/package.json | HACK-001 |
| web/package-lock.json | HACK-001 |
| web/vite.config.ts | HACK-001 |
| web/src/App.tsx | HACK-001 |
| web/src/index.css | HACK-001 |
| web/src/lib/ | HACK-001 |
| app/schemas/ | HACK-002 |
| app/fixtures/api/ | HACK-002 |
| docs/FRONTEND-BRIEF.md | HACK-005 |
| web/DESIGN.md | HACK-005 |
| web/src/theme.css | HACK-005 |
| web/src/ui/ | HACK-005 |
| app/fixtures/graph/ | HACK-003 |
| app/fixtures/deep/ | HACK-009 |
