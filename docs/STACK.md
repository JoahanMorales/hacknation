# Stack · Python + FastAPI

Cargar al crear el esqueleto (tarea de setup), al añadir un endpoint o al tocar dependencias. Por qué: la estructura evita que cuatro agentes editen los mismos archivos.

## Estructura que permite paralelizar

```text
app/
  main.py            # crea la app y AUTODESCUBRE routers; nadie lo edita tras el setup
  config.py          # settings desde env (pydantic-settings); dueño: tarea de setup
  schemas/           # contratos Pydantic compartidos; dueño único en OWNERS.md
  routers/<feature>.py   # un archivo por feature/tarea; expone `router = APIRouter()`
  services/<feature>.py  # lógica de la feature; mocks etiquetados con DEMO_MODE
  fixtures/          # datos de demo etiquetados (json)
  tests/test_<feature>.py  # tests del producto, un archivo por feature
pyproject.toml / uv.lock   # dueño único (dependencias)
tests/               # pruebas del PAQUETE de coordinación; no pongas tests del producto aquí
```

Reservar por tarea `app/routers/<feature>.py, app/services/<feature>.py, app/tests/test_<feature>.py`; `tests/` en la raíz es del paquete de coordinación. Por qué: Archivos probables disjuntos permiten claims simultáneos sin traslape.

## main.py con autodescubrimiento

```python
import importlib
import pkgutil

from fastapi import FastAPI

from app import routers

app = FastAPI(title="Hack")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# `routers` (no `app.routers`): la variable `app` tapa al paquete del mismo nombre.
for module in pkgutil.iter_modules(routers.__path__):
    router = getattr(importlib.import_module(f"{routers.__name__}.{module.name}"), "router", None)
    if router is not None:
        app.include_router(router)
```

Por qué: añadir una feature es crear un archivo; `main.py` no se vuelve un punto de conflicto.

## Setup (primera tarea, ~10 min)

```bash
uv init --bare --name hacknation --python 3.12 --pin-python .   # sólo pyproject.toml; --app en uv 0.12 crea src/ y build
uv add fastapi "uvicorn[standard]" pydantic-settings httpx
uv add --dev pytest ruff httpx2   # httpx2 evita el aviso de deprecación de TestClient
mkdir -p app/routers app/services app/schemas app/fixtures app/tests
touch app/__init__.py app/routers/__init__.py app/services/__init__.py app/schemas/__init__.py
cat >> pyproject.toml <<'TOML'

[tool.pytest.ini_options]
testpaths = ["app/tests"]
pythonpath = ["."]
addopts = "-q --tb=short"
TOML
cat > app/tests/test_health.py <<'PY'
from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    assert TestClient(app).get("/health").json() == {"status": "ok"}
PY
# + app/main.py de la sección anterior
bash scripts/hack init-smoke --command "uv run ruff check app && uv run pytest"
```

Verificar antes que las reglas del evento permitan boilerplate previo; si no, ejecutar estos pasos tras el inicio oficial. Por qué: el código previo puede estar restringido (HACKATHON.md).

## Convenciones

| Regla | Por qué |
|---|---|
| Tests con `fastapi.testclient.TestClient`; cada tarea añade al menos el camino feliz y un error. | `Cómo verificar` = `uv run pytest -q app/tests/test_<feature>.py`. |
| Llamadas externas sólo en `services/`, con timeout y fallback mock si `DEMO_MODE=true`. | La demo sobrevive a una API caída. |
| Respuestas mock incluyen `"demo_data": true`. | R05: los mocks se etiquetan. |
| Nuevas dependencias: pídelas a la tarea dueña de `pyproject.toml`/`uv.lock` o márcalas en el PR para humano. | El merge automático rechaza lockfiles (R32). |
| Ejecutar local: `uv run uvicorn app.main:app --reload --port 8000`. | Un comando conocido por todos. |
| Frontend de demo: si hace falta, HTML/JS estático en `app/static/` servido por FastAPI. | Un solo proceso que arrancar en la demo. |
