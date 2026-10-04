import importlib
import pkgutil
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import routers

app = FastAPI(title="OlivIA")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# `routers` (no `app.routers`): la variable `app` tapa al paquete del mismo nombre.
for module in pkgutil.iter_modules(routers.__path__):
    router = getattr(importlib.import_module(f"{routers.__name__}.{module.name}"), "router", None)
    if router is not None:
        app.include_router(router)

# El build del frontend se monta al final: /api/* siempre gana sobre los estáticos.
WEB_DIST = Path(__file__).resolve().parent.parent / "web" / "dist"
if WEB_DIST.is_dir():
    app.mount("/", StaticFiles(directory=WEB_DIST, html=True), name="web")
