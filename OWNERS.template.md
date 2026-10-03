# Dueños de recursos compartidos · plantilla

Asigna cada patrón a una tarea existente antes de reclamarlo. Por qué: un solo escritor evita conflictos difíciles de integrar.
Usa patrones de ruta relativos, sin espacios, separados por coma en Archivos probables; no uses rutas absolutas ni `..`. Por qué: el chequeo es portable y conservador.
Una tarea dueña no es prerequisito de todos: consumidores usan contratos y mocks publicados. Por qué: ownership no crea un nuevo cuello serial.

| Patrón | Tarea dueña |
|---|---|
| pyproject.toml | HACK-001 |
| uv.lock | HACK-001 |
| app/main.py | HACK-001 |
| app/config.py | HACK-001 |
| app/schemas/ | HACK-002 |
| .github/workflows/ | HACK-001 |

Completa o elimina patrones de tecnologías inexistentes y HACK-001 (setup) y HACK-002 (contract) los crea /hack-plan. Por qué: los IDs de ejemplo no constituyen trabajo autorizado.
