# Stack · FastAPI + React

Setup de la primera tarea (HACK-001) y referencia de estructura. Las convenciones del día a día están en las skills `hack-backend` y `hack-frontend`. Por qué: el setup se lee una vez; las convenciones, en cada tarea.

Verificar antes que las reglas del evento permitan boilerplate previo; si no, ejecutar estos pasos tras el inicio oficial. Por qué: el código previo puede estar restringido (HACKATHON.md).

## Estructura

```text
app/                       # backend FastAPI (skill hack-backend)
  main.py                  # autodescubre routers y sirve web/dist; nadie lo edita tras el setup
  config.py · schemas/ · fixtures/ · routers/<f>.py · services/<f>.py · tests/test_<f>.py
web/                       # frontend Vite + React + TS + Tailwind v4 + Motion (skill hack-frontend)
  DESIGN.md · src/App.tsx · src/index.css · src/lib/api.ts · src/features/<f>/index.tsx
tests/                     # pruebas del PAQUETE de coordinación; no pongas tests del producto aquí
pyproject.toml / uv.lock · web/package.json / web/package-lock.json   # dueño único (setup)
```

Una tarea vertical reserva `app/routers/<f>.py, app/services/<f>.py, app/tests/test_<f>.py, web/src/features/<f>/`. Por qué: Archivos probables disjuntos permiten claims simultáneos sin traslape.

## Setup backend (~5 min)

```bash
uv init --bare --name hacknation --python 3.12 --pin-python .   # sólo pyproject.toml; --app en uv 0.12 crea src/ y build
uv add fastapi "uvicorn[standard]" pydantic-settings httpx
uv add --dev pytest ruff httpx2 playwright   # httpx2 evita el aviso de TestClient; playwright para webapp-testing
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
    assert TestClient(app).get("/api/health").json() == {"status": "ok"}
PY
# + app/main.py (abajo)
```

### app/main.py

```python
import importlib
import pkgutil
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import routers

app = FastAPI(title="Hack")


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
```

Por qué: añadir un endpoint es crear `app/routers/<f>.py`; `main.py` no se vuelve punto de conflicto.

## Setup frontend (~5 min)

```bash
CI=1 npm create vite@latest web -- --template react-ts --no-interactive
npm --prefix web install --no-audit --no-fund --loglevel=error
npm --prefix web install --no-audit --no-fund --loglevel=error tailwindcss @tailwindcss/vite motion @phosphor-icons/react @fontsource-variable/geist
rm -rf web/src/App.css web/src/assets web/public/vite.svg
mkdir -p web/src/features web/src/lib
sed -i.bak 's#<title>.*</title>#<title>hacknation</title>#; /vite.svg/d' web/index.html && rm web/index.html.bak
# + los cinco archivos de abajo; luego web/DESIGN.md con la skill design-taste-frontend
```

### web/vite.config.ts

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// /api va a FastAPI en dev; en la demo FastAPI sirve web/dist (un solo proceso).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
});
```

### web/src/index.css

```css
@import "tailwindcss";
@import "@fontsource-variable/geist";

@theme {
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
}
```

### web/src/lib/api.ts

```ts
// Única puerta al backend: todas las rutas viven bajo /api.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}
```

### web/src/App.tsx

```tsx
import type { ComponentType } from "react";

// Cada feature es web/src/features/<nombre>/index.tsx con `export default` y `order`.
// Añadir una feature = crear su carpeta; App.tsx no se vuelve punto de conflicto.
type FeatureModule = { default: ComponentType; order?: number };

const features = Object.entries(
  import.meta.glob<FeatureModule>("./features/*/index.tsx", { eager: true }),
)
  .map(([path, module]) => ({ path, ...module }))
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

export default function App() {
  return (
    <main className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-12 font-sans text-zinc-900 dark:text-zinc-100">
      {features.map(({ path, default: Feature }) => (
        <Feature key={path} />
      ))}
    </main>
  );
}
```

### web/src/main.tsx

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## Smoke del producto

```bash
uv run playwright install chromium   # una vez por máquina (~100 MB), para webapp-testing
bash scripts/hack init-smoke --command "uv run ruff check app && uv run pytest && npm --prefix web ci --prefer-offline --no-audit --no-fund --loglevel=error && npm --prefix web run lint && npm --prefix web run build"
```

`hack merge` repite este smoke en un clon limpio: por eso incluye `npm ci`. Por qué: el merge debe probar el producto completo, no sólo Python.

## Ejecutar

| Modo | Comando |
|---|---|
| Desarrollo | `uv run uvicorn app.main:app --reload --port 8000` + `npm --prefix web run dev` (abre :5173) |
| Demo (un proceso) | `npm --prefix web run build && uv run uvicorn app.main:app --port 8000` (abre :8000) |
