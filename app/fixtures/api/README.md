# Contratos y ejemplos de API v1

Fuente de verdad: `app/schemas/__init__.py` (Pydantic v2). JSON usa snake_case,
IDs OMIM/ORPHA/MONDO y niveles de evidencia en español. UI traduce los niveles
a observed / inferred / hypothesis / contradicted. Todos estos ejemplos son
`demo_data: true`; se usan como fallback etiquetado, no como respuestas reales.

| Ruta | Request | Respuesta | Ejemplo |
|---|---|---|---|
| GET /api/graph/overview | ninguno | GraphOverview | graph_overview.json |
| POST /api/symptoms/extract | SymptomsExtractRequest | SymptomsExtractResult | symptoms_extract.json |
| POST /api/diagnose | DiagnosisRequest | DiagnosisResult | diagnose.json, diagnose_step_01..05.json |
| POST /api/next-question | DiagnosisRequest | NextQuestion | next_question.json |
| GET /api/node/{id} | disease ID | NodeResult | node.json |
| GET /api/edge/{id} | edge ID | EdgeResult | edge.json |
| POST /api/explain | ExplainRequest | ExplainResult | explain.json |
| POST /api/action-plan | ActionPlanRequest | ActionPlan | action_plan.json, action_plan_unsupported.json |
| POST /api/transcribe/session | ninguno | TranscribeSession | transcribe_session.json |

`terms` es `{hpo_id,label,present,quote?}[]`; se rechazan IDs repetidos o
contradictorios. `ranking` incluye `disease_id,name,pct,low,high,drivers`.
`next_question` contiene `hpo_id,label,question,candidates,information_gain_bits,
if_yes,if_no,rationale`; un `hpo_id: null` indica evidencia insuficiente.
`GraphOverview.nodes` lleva `{id,name,group,x,y,synonyms,mechanism_ids}`.
`group` es el ID HPO del sistema; `groups` lleva `{id,label,count,x,y,r}`.
Los conteos por grupo cubren las 12820 enfermedades, no sólo los 300 nodos visibles.
`total_diseases` indica la capa completa; `displayed_diseases` indica los 300
nodos del ejemplo. No mostrar 300 como si fueran todas las enfermedades.

El caso publicado en `../case/pompe_case.json` tiene cinco términos en orden
de dictado. Los dos síntomas cardiacos están explícitamente negados. Las
narraciones ES/EN son adaptaciones redactadas, no grabaciones ni citas del artículo.
El generador conserva IDs reales para todas las estrellas y todo el top-10.
Las posiciones y galaxias se muestrean del layout HACK-003 publicado en el commit
`4fded4157b2742811294f9df1e93314fd578a455`; URL y hash fijados en procedencia.

## Reproducir

Desde la raíz, sin requerir HACK-001:

```bash
uv run --no-project --with pydantic python app/fixtures/api/generate.py --download
uv run --no-project --with pydantic python app/fixtures/api/generate.py --check
uv run --no-project --with pydantic --with pytest pytest -q app/tests/test_schemas.py
```

Sin `--download`, lee `.cache/hpo/`. `--cache RUTA` permite otro directorio.
`--check` valida hashes y esquemas sin red ni reescritura. Los crudos no se
versionan; `provenance.json` conserva URLs, versiones y SHA-256. Las siguientes
regeneraciones deben usar los mismos hashes; una descarga diferente requiere revisión.
Los JSON se escriben y versionan con LF para conservar los hashes en Windows y Unix.

## Método y límites

Los ejemplos de diagnóstico se calculan, no se escriben a mano: frecuencias
de `phenotype.hpoa` de la release HPO `v2026-09-01` (su encabezado indica
anotaciones `2026-09-02`), LR por término, propagación por ancestros/descendientes,
prior uniforme y normalización sobre todos los IDs OMIM/ORPHA/MONDO con fenotipos.
No se fusionan registros de distintas bases ni se incluyen IDs DECIPHER.
Frecuencia desconocida o término no anotado → fondo, LR=1. NOT y 0/n sí
representan ausencia. Se prefieren anotaciones exactas; entre compatibles se
usa la mayor frecuencia. Nunca se compara por un ancestro común de dos hermanos.

Los rangos son una envolvente de sensibilidad del 90% con 64 muestras y semilla
fija: uniforme dentro de categorías HPO y Beta(n+1,d-n+1) para cuentas publicadas.
No son intervalos clínicos calibrados. El cálculo multiplica síntomas correlacionados
y el propio caso está en HPO: esta demo no es una validación independiente.
`other_pct` conserva la masa fuera del top-10. Las siguientes preguntas del ranking
usan sus dos primeras entradas; el ejemplo independiente `next_question.json`
compara el par de demo Pompe/FKRP después de CK, antes de preguntar respiración.
No se fuerza ese par al top-2 ni se alteran los porcentajes para el efecto visual.

La arista molecular es un ejemplo citado, inferido y con confidence ilustrativa,
no la capa curada completa de HACK-009. Explain es texto redactado, no generado
por OpenAI. El token de transcripción es inutilizable (`usable:false`, expirado).
La línea de tiempo compara objetivos diferentes: no demuestra mejora 10×.
Las acciones son contactar/preguntar, nunca recomendar un tratamiento.

## Fuentes y licencias

- HPO: https://github.com/obophenotype/human-phenotype-ontology/releases/tag/v2026-09-01
- Caso: phenopacket-store 0.1.27, PMID:7668832. Fuente exacta y hash en el fixture.
- Artículo: https://pubmed.ncbi.nlm.nih.gov/7668832/
- phenopacket-store: BSD-3-Clause; conservar atribución (véase `../case/SOURCES.md`).
- HPO: revisar sus términos/atribución de datos; anotaciones de Orphadata bajo CC BY 4.0.
- Ruta molecular: https://www.nature.com/articles/ncomms11534
- Registro FKRP: https://clinicaltrials.gov/study/NCT04001595
- Tiempo al diagnóstico: https://www.nature.com/articles/s41431-024-01604-z

Integración: consumidores importan sólo contratos públicos de `app.schemas`;
no importan el scorer de fixtures. HACK-007 conserva el scorer de producción.
