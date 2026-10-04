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
| web/src/App.tsx | HACK-028 |
| web/src/index.css | HACK-001 |
| web/src/lib/ | HACK-001 |
| app/schemas/ | HACK-002 |
| app/fixtures/api/ | HACK-002 |
| docs/FRONTEND-BRIEF.md | HACK-005 |
| web/DESIGN.md | HACK-028 |
| web/src/theme.css | HACK-028 |
| web/src/ui/ | HACK-028 |
| app/fixtures/graph/ | HACK-003 |
| app/fixtures/deep/ | HACK-009 |

Ola 3 (3 oct, autorizado por Joahan): `web/src/App.tsx`, `web/DESIGN.md`, `web/src/theme.css` y `web/src/ui/` pasan a HACK-028 (rediseño integral, saus-1). HACK-001 y HACK-005 están integradas; quien necesite un cambio en esos archivos lo pide a HACK-028. Por qué: un solo escritor para el rediseño.
