---
name: hack-backend
description: Backend del hackatón (app/, Python 3.12 + FastAPI + uv + pytest). Úsala al crear o cambiar endpoints, servicios, esquemas, tests o dependencias de Python.
---

# Backend del hackatón

Setup inicial verificado en `docs/STACK.md`. Aquí sólo convenciones para trabajar en paralelo.

## Estructura

```text
app/main.py               # autodescubre routers y sirve web/dist; nadie lo edita tras el setup
app/config.py             # settings (pydantic-settings) desde env; dueño: setup
app/schemas/              # contratos Pydantic compartidos; dueño único (tarea contract)
app/fixtures/             # datos de demo etiquetados
app/routers/<f>.py        # router = APIRouter(prefix="/api/<f>", tags=["<f>"])
app/services/<f>.py       # lógica; llamadas externas con timeout y fallback mock
app/tests/test_<f>.py     # TestClient: camino feliz + un error
```

`tests/` en la raíz es del paquete de coordinación: no pongas tests del producto ahí.

## Reglas

| Regla | Por qué |
|---|---|
| Todas las rutas bajo `/api/...`. | El frontend usa un solo prefijo y FastAPI sirve la web en `/`. |
| Reserva `app/routers/<f>.py, app/services/<f>.py, app/tests/test_<f>.py` (+ `web/src/features/<f>/` si es vertical). | Claims disjuntos. |
| Lee esquemas de `app/schemas/`; para cambiarlos `hack msg <dueño> --kind request` y, tras el cambio, el dueño avisa `--kind contract` a `related:`. | Un solo escritor por contrato. |
| Llamadas externas sólo en `services/`, `httpx` con `timeout=`, fallback mock si `DEMO_MODE=true` o falla. | La demo sobrevive a una API caída. |
| Respuestas mock con `"demo_data": true`. | R05: mocks etiquetados. |
| Dependencias nuevas: pídelas al dueño de `pyproject.toml`/`uv.lock`. | El merge automático rechaza lockfiles. |
| Secretos sólo por env (`app/config.py`); nunca en código ni fixtures. | El hook de secretos bloquea el commit. |

## Comandos

```bash
bash scripts/q uv run pytest app/tests/test_<f>.py
bash scripts/q uv run ruff check app
uv run uvicorn app.main:app --reload --port 8000
```
