# Spike OpenAI · resultado (HACK-004, 2026-10-03)

Probado con la cuenta del equipo desde la Jetson Orin Nano. Respuestas reales en `recorded/` (`demo_data: true` cuando se sirvan como respaldo).

## Modelos confirmados (`GET /v1/models`)

| Uso | Modelo | Estado |
|---|---|---|
| Extracción síntomas → HPO | `gpt-6-luna` (Responses API + `json_schema` strict) | Funciona |
| Dictado en vivo | `gpt-live-transcribe` (Realtime, `intent=transcription`) | Funciona |
| Explicación (HACK-010) | `gpt-6.1-sol` | Existe; no probado aquí |
| Transcripción alternativa | `gpt-transcribe` | Existe; la guía sólo lo documenta en sesiones Realtime |

## Extracción estructurada

- Candidatos: buscador léxico mínimo sobre etiquetas y sinónimos exactos de `hp.json` → 9 IDs para el caso, con distractores (CK muy/levemente elevada, CK disminuida).
- El JSON Schema limita `hpo_id` con `enum` a los candidatos: el modelo no puede inventar IDs.
- EN y ES: los 5 términos del caso, presentes y negados (`no cardiomyopathy` / `No hay cardiomiopatía` → `present: false`), sin elegir distractores.

| Idioma | Latencia | Tokens entrada / salida |
|---|---:|---:|
| EN | 4.13 s | 438 / 192 |
| ES | 3.14 s | 447 / 185 |

## Transcripción en vivo

Sesión: `audio/pcm` 24 kHz, `turn_detection: null`, `languages: [en|es]`, `delay: low`, `keywords` del cluster (CK, presiones inspiratoria/espiratoria, Pompe, GAA, FKRP, limb-girdle…). Audio: TTS `gpt-4o-mini-tts` del dictado del caso, enviado en trozos de 100 ms.

| Idioma | Audio | Primer delta | Final tras commit | Deltas | Resultado |
|---|---:|---:|---:|---:|---|
| EN | 14.2 s | 1.84 s | 4.18 s | 43 | Idéntico a la referencia |
| ES | 19.2 s | 1.67 s | 5.01 s | 50 | "creatina **kinase**" en vez de "quinasa"; resto idéntico |

## Fallos y decisiones para otras tareas

- **HACK-008:** el buscador léxico es en inglés; para el dictado en español se usaron los candidatos del texto en inglés. El real necesita sinónimos en español o un paso de traducción antes de buscar candidatos. La extracción en sí funciona bien con citas en español.
- **HACK-017:** usar `keywords` por idioma (en ES, "creatina quinasa") para no anglicizar. El audio se mandó más rápido que en tiempo real; en el navegador los deltas llegan mientras el médico habla.
- **HACK-017 / seguridad:** el navegador no debe ver la API key: el backend crea un token efímero para la sesión WebRTC.
- Plan B: `recorded/extract_*.json` y `recorded/transcribe_*.json` sirven como respuestas grabadas del caso.

## Reproducir

```bash
uv run python spikes/openai/spike.py --extract --transcribe   # requiere OPENAI_API_KEY en .env y data/raw/hp.json (bash data/fetch.sh)
python3 spikes/openai/spike.py --check                        # sin red
```
