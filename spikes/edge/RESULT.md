# Modo edge en la Jetson · resultado (HACK-016, 2026-10-03)

La app completa (FastAPI + web compilada, un solo proceso) corre en la Jetson Orin Nano Super. Sin red ni clave de OpenAI, todo el recorrido de la demo sigue funcionando: el scoring es local y los pasos de IA usan respuestas reales grabadas (`demo_data: true`).

## Plataforma

| Elemento | Valor |
|---|---|
| Placa | NVIDIA Jetson Orin Nano Engineering Reference Developer Kit Super |
| JetPack / L4T | `nvidia-jetpack 6.2.3+b81` · L4T R36.5.2 |
| CUDA | 12.6.11 (no lo usa la app: todo corre en CPU) |
| Modo de energía | `MAXN_SUPER` · 6 núcleos · 7.4 GiB de RAM compartida |
| Runtime | uv 0.12.18 (Python 3.12 gestionado por uv; el sistema trae 3.10) · Node 20.20.2 |

## Medición

`uv run python spikes/edge/measure.py --port 8016` levanta uvicorn con `DEMO_MODE=true` y sin `OPENAI_API_KEY`, y mide la primera llamada y la mediana de 5 llamadas en caliente.

| Paso | Primera | En caliente | Origen |
|---|---:|---:|---|
| Arranque del servidor | 1.55 s | | |
| Memoria del proceso (RSS) | 204 MB | | |
| `npm run build` de la web | 8.7 s | | |
| `GET /` (web) | 20 ms | 2 ms | local |
| `GET /api/graph/overview` (12,867 nodos, 1.4 MB) | 7 ms | 12 ms | local |
| `POST /api/symptoms/extract` | 624 ms* | 3 ms | grabado (HACK-004) |
| `POST /api/diagnose` (5 términos, 12,867 enfermedades) | 988 ms* | 334 ms | **local, real** |
| `POST /api/next-question` | 348 ms | 339 ms | **local, real** |
| `GET /api/node/{id}` | 233 ms* | 4 ms | local |
| `POST /api/explain` | 4 ms | 3 ms | grabado (gpt-6.1-sol) |
| `POST /api/action-plan` | 5 ms | 3 ms | **local, real** |
| `POST /api/transcribe/session` | 3 ms | 3 ms | sin token (`usable: false`) |

\* La primera llamada incluye cargar `annotations.json` (9.6 MB) en memoria; se hace una vez por proceso.

## Qué funciona sin conexión

- **Sí, real:** constelación, scoring LR con rango, siguiente pregunta, nodo y aristas con evidencia, plan de acción y línea de tiempo.
- **Sí, grabado:** extracción de síntomas, explicación para la familia y transcripción del caso de demo.
- **No:** dictado en vivo (`gpt-live-transcribe` necesita red) y extracción o explicación de casos nuevos: con un texto distinto al del caso, la extracción devuelve el caso grabado etiquetado como `demo_data`. No se probó un modelo de transcripción local en la GPU.

## Cómo correrlo en la Jetson

```bash
npm --prefix web ci && npm --prefix web run build
DEMO_MODE=true uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
```

El puerto 8000 lo ocupa otro proyecto en esta Jetson; para desarrollo, `API_PORT=8001 npm --prefix web run dev`.
