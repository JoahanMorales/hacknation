# IDEA · Constelación (Constellation) — de los síntomas a la comunidad

> Reto 05 · 7th Global AI Hackathon (Hack-Nation × OpenAI × Buffalo Initiative), 3–4 oct 2026.
> Marcas: **[Decidido]** · **[Recomendación]** (sugerido tras investigar) · **[Por validar]** (probar o citar antes del pitch).
> Toda cifra del pitch sale de §11 con su fuente. Nada de memoria del modelo.

## 1. Una línea

Para **médicos que ven síntomas difusos y para líderes de grupos de pacientes**, Constelación convierte un caso dictado en un **diferencial explicable** (un grafo de 12,867 enfermedades que se poda en vivo hasta 2 candidatas, con cada conexión citada) y lo lleva hasta **la comunidad, el registro y el siguiente paso de esta semana**, en lugar de buscar por separado en PubMed, Orphanet y directorios de pacientes.

**Diferencial frente a otros equipos del reto** (repos públicos `equilibrium`, `rare-atlas`): ellos parten de "Maria busca su enfermedad". Nosotros partimos del momento en que **todavía no hay diagnóstico** y terminamos donde exige el brief (colaboración + activo + siguiente paso). Es la única ruta que demuestra los 5 criterios en un solo recorrido de 3 minutos.

## 2. Problema y usuarios

| Persona | Momento | Qué necesita | Paso del flujo |
|---|---|---|---|
| Dra. Ruiz, neuróloga general | Paciente de 34 años con debilidad y fatiga, CK alta | Saber qué no está viendo y qué prueba pedir | 2–4 |
| Devon, cuidador recién diagnosticado | Sale de consulta con un nombre que no conoce | Entender en lenguaje simple y a quién acudir | 5 |
| **Maria**, líder de CureLGMD2i (usuario central del brief) | Su enfermedad no tiene tratamiento aprobado | Con quién colaborar, qué activo reutilizar, qué hacer esta semana | 6 |

- **Dolor (con fuente):** diagnóstico promedio de **4.7 años**; 56% tarda más de 6 meses desde la primera consulta (EURORDIS Rare Barometer, 6,507 personas, 41 países). En el caso de la demo, el Pompe de inicio tardío se confunde con frecuencia con LGMD y la literatura reporta retrasos de años **[Por validar: cifra exacta y cita de §11 antes de ponerla en pantalla]**.
- **Resultado que cambia:** de "otro especialista en 6 meses" a "esta prueba de gota de sangre seca esta semana" o "este registro y estas 2 organizaciones que ya comparten tu mecanismo".

## 3. Caso de demo [Recomendación fuerte]

**Pompe de inicio tardío (GAA, `OMIM:621314`) frente a LGMD R9 (FKRP, `ORPHA:34515`).** Elegido porque:

1. **Es un diferencial real y documentado:** el Pompe tardío se diagnostica mal como distrofia de cinturas; las guías recomiendan cribar con gota de sangre seca (DBS) en miopatías proximales no clasificadas o CK alta (§11).
2. **Los datos lo separan:** en `phenotype.hpoa` v2026-09-01 lo discriminan la afectación respiratoria (presión inspiratoria/espiratoria máxima reducida, distrés respiratorio → Pompe) y la hipertrofia de pantorrillas y la reducción de alfa-distroglicano → LGMD R9. Comparten CK elevada y dificultad para subir escaleras. Esto da la **siguiente mejor pregunta** verificable.
3. **Los dos finales son buenos para el jurado:**
   - Pompe → existe tratamiento: el siguiente paso es **DBS de GAA esta semana**. 10× = meses o años de retraso frente a un test barato en la primera visita.
   - LGMD R9 → **sin tratamiento aprobado hoy**: BBP-418 (ribitol) tiene NDA con revisión prioritaria y fecha FDA del **27 nov 2026**. Maria recibe el Global FKRP Registry (NCT04001595), el estudio de historia natural GRASP, y el **puente por mecanismo**: FKRP, FKTN y CRPPA/ISPD están en la misma ruta de ribitol-fosfato sobre alfa-distroglicano, con ribitol preclínico en modelos de ratón. Es la "conexión entre enfermedades de nombres distintos" que pide el brief, con su nivel de evidencia honesto (clínico en FKRP, **preclínico** en FKTN/CRPPA).
4. **Contraejemplo para la calidad del grafo:** el mismo gen FKRP va de LGMD R9 leve a distrofia muscular congénita grave (serie alélica). "Mismo gen, distinto cuadro" impide fusionar nodos a ciegas.
5. **Caso dictado:** sale de `phenopacket-store` (cohorte GAA, 10 casos publicados con diagnóstico conocido). Se dicta en primera persona clínica, sin datos personales. **[Por validar]** elegir el caso con afectación respiratoria y CK alta.

## 4. Flujo de demo (3 min; cada paso = 1 tarea vertical)

| # | Usuario hace | Ve en pantalla | API | Prio |
|---|---|---|---|---|
| 1 | Abre la app | Constelación de 12,867 enfermedades coloreadas por grupo (layout precalculado) y una búsqueda global | `GET /api/graph/overview` | P0 |
| 2 | Dicta el caso (ES/EN) | Transcripción en vivo; cada síntoma aparece como chip HPO, con los negados tachados ("sin cardiomiopatía") | `POST /api/symptoms/extract` (+ transcripción OpenAI en navegador) | P0 |
| 3 | Sigue dictando | **Wow:** con cada chip el grafo se apaga y se poda hasta 2 candidatas; % de coincidencia con rango y top-3 síntomas que empujan | `POST /api/diagnose` | P0 |
| 4 | Pulsa "Siguiente pregunta" | "¿Presión inspiratoria reducida / disnea al acostarse?" → sí: Pompe sube; "¿Hipertrofia de pantorrillas?" → sí: LGMD R9 sube. Y la prueba que lo resuelve: DBS de GAA | `POST /api/next-question` | P0 |
| 5 | Abre una candidata o una arista (ratón; gestos en P1) | Panel: genes, mecanismo, síntomas a favor y en contra; por arista: fuente, fecha, tipo, confianza, nivel (observado/inferido/hipótesis/contradictorio). Botón "explicar para la familia" | `GET /api/node/{id}`, `GET /api/edge/{id}` | P0 |
| 6 | "Acción para el grupo" (ruta LGMD R9) | Vista de Maria: grupos activos, registro y estudio reutilizables, enfermedades puente por mecanismo, qué difiere, qué requiere experto, **paso de esta semana**, línea de tiempo actual frente a la propuesta con supuestos. Si no hay ruta: qué se buscó y qué falta | `POST /api/action-plan` | P0 |

- **Momento wow:** ≤ 45 s desde el inicio. El caso queda precargado como plan B si falla el micrófono.
- **Aviso permanente:** "Herramienta de exploración. No es un diagnóstico. % = coincidencia de fenotipo, no probabilidad clínica."

## 5. Scoring (decisión de diseño, explicable)

- **Método [Recomendación]:** razón de verosimilitud por fenotipo al estilo LIRICAL. Para cada enfermedad D y término observado t: LR = P(t|D)/P(t|¬D), con P(t|D) de la frecuencia en `phenotype.hpoa` y P(t|¬D) de la frecuencia de fondo entre las 12,867 enfermedades. Producto de LR → posterior normalizado sobre el ranking → **% de coincidencia + rango** (bootstrap sobre frecuencias faltantes).
- **Obligatorio** (comprobado con los datos reales):
  1. **Propagar por la jerarquía HPO:** el síntoma observado coincide con anotaciones de sus ancestros y descendientes. Con coincidencia exacta, "debilidad proximal" sale como ausente en Pompe solo porque está anotada como "debilidad de miembros inferiores".
  2. **No anotado ≠ ausente:** sin anotación se usa la frecuencia de fondo (LR≈1), nunca 0.01. Si no, inventa diferencias ("fatiga" ausente en LGMD).
  3. Los síntomas negados usan LR = (1−P(t|D))/(1−P(t|¬D)).
- **El LLM nunca produce el número.** OpenAI extrae términos, reconcilia sinónimos y explica; el número sale de este cálculo y es reproducible.
- **"Siguiente mejor pregunta":** el término no preguntado que maximiza la ganancia de información entre las 2 primeras candidatas.
- **Validación honesta [P1]:** correr el scoring sobre los 10 casos GAA y una muestra de `phenopacket-store` (0.1.27, BSD-3); reportar top-1/top-3 en pantalla y en el README como "validación retrospectiva sobre casos publicados, no prueba clínica".
- **Umbral "sin ruta soportada":** si la mejor coincidencia queda por debajo de **[Por validar con la validación]** o hay menos de 3 síntomas, se muestra el estado honesto con lo que falta preguntar.

## 6. Datos (contrato `app/schemas/`; build offline en `data/`)

| Entidad | Campos clave | Fuente (licencia) |
|---|---|---|
| Disease | id (OMIM/ORPHA/MONDO), name, synonyms[], group, mechanism_ids[], x, y | HPO annotations + Orphadata (CC BY 4.0) + MONDO (CC BY 4.0) |
| Phenotype | hpo_id, name, ancestors[], ic | `hp.json` v2026-09-01 |
| Annotation | disease_id, hpo_id, freq, source | `phenotype.hpoa` v2026-09-01 |
| Gene / Mechanism | symbol, disease_ids[], pathway | Orphadata genes; capa profunda curada para el cluster |
| Edge | src, dst, type, source_url, record_id, retrieved_at, confidence, evidence_level ∈ {observado, inferido, hipotesis, contradictorio} | Curado + extraído con OpenAI (cada uno con cita) |
| PatientGroup | name, diseases[], url, registry | Curado y verificado (IPA, CureLGMD2i, LGMD Awareness Foundation) |
| Asset | kind ∈ {registro, historia_natural, ensayo, biomarcador}, id, url | ClinicalTrials.gov API v2 (sin clave), NIH RePORTER API v2 (sin clave) |
| Case | transcript, terms[{hpo_id, present}] | Dictado; caso de `phenopacket-store` |
| DiagnosisResult | ranking[{disease_id, pct, low, high, drivers[]}], next_question | Cálculo local |

- **Capa ancha:** 12,867 enfermedades con fenotipos para el efecto visual y el scoring (todas puntúan).
- **Capa profunda (curada a mano, con URL):** cluster de distroglicanopatías (FKRP, FKTN, CRPPA, POMT1, POMGNT1, LARGE1) + Pompe (GAA) + 2–3 LGMD de diferencial (CAPN3, DYSF, ANO5). ~12 enfermedades.
- **OMIM no se consulta directo** (requiere licencia): sus fenotipos llegan dentro de las anotaciones de HPO.
- **Snapshot** procesado en el repo (`app/fixtures/*.json`, < 5 MB); los crudos (35 MB) se bajan con `data/fetch.sh`, sin commit.

## 7. OpenAI (necesario para los premios del track)

| Uso | Modelo [Por validar en spike de 20 min] | Salida |
|---|---|---|
| Transcribir el dictado en vivo (ES/EN), con `keywords` médicas del cluster | `gpt-live-transcribe` (Realtime, WebRTC desde el navegador) | Texto incremental |
| Extraer síntomas → HPO con negación | Modelo rápido (`gpt-6-luna`) + salida estructurada (JSON Schema) restringida a IDs candidatos que da un buscador local de sinónimos HPO | `[{hpo_id, present, quote}]` |
| Reconciliar sinónimos y abstracts → aristas con cita | Mismo, en el build offline | Aristas con `source_url` y `quote` |
| Explicar el camino del grafo para la familia | Modelo de calidad (`gpt-6.1-sol`), citando solo aristas recibidas | Texto con `[edge_id]` |

- **Regla anti-alucinación:** el LLM solo elige entre IDs que le pasamos y cita aristas existentes; un ID o cita desconocida se descarta en el backend.
- **Plan B:** respuestas grabadas del caso de demo con `demo_data: true`; el scoring es local y siempre funciona.

## 8. Rubric → evidencia (el brief no publica pesos)

| Criterio | Cómo lo demostramos |
|---|---|
| Graph quality | IDs estables, grupos por mecanismo y fenotipo, contraejemplo FKRP (serie alélica), rangos de incertidumbre |
| Evidence integrity | Cada arista con fuente, fecha, nivel; clínico frente a preclínico visible (ribitol: FKRP clínico, FKTN/CRPPA preclínico) |
| Patient progress | Paso 6: de diagnóstico aislado → registro → organizaciones puente → paso de esta semana |
| 10× impact | Línea de tiempo con supuestos: 4.7 años de promedio (EURORDIS) frente a la ruta propuesta (DBS en la primera visita / unirse al registro y estudio existentes en vez de crear uno) |
| Ambition and product craft | Grafo que se poda con la voz, explicación por arista, gestos opcionales, validación retrospectiva publicada |

**Entregables:** prototipo corriendo (FastAPI sirve la web en un proceso) · README con arquitectura y `data/fetch.sh` + `data/build.py` reproducibles · video de equipo + walkthrough de 1 min (Dra. Ruiz → Maria) · plan B grabado.

## 9. Tecnología y cortes

| Pieza | Decisión | Por qué |
|---|---|---|
| Grafo web | **sigma.js v3 + graphology** (`@react-sigma`), posiciones precalculadas en `data/build.py` | 13k nodos fluidos en WebGL; el layout en el navegador es lo que se rompe |
| Poda en vivo | Cambia solo el tamaño, color y alfa de cada nodo según el score, con transición | Barato y muy visual |
| Gestos | **P1.** MediaPipe `GestureRecognizer` en el navegador (`@mediapipe/tasks-vision`), gestos integrados: `Open_Palm` = atrás, `Pointing_Up` = abrir nodo, `Victory` = siguiente pregunta, `Closed_Fist` = pausa; zoom con pellizco por landmarks | Sin entrenar nada; el ratón sigue siendo P0 |
| **Laya** | **P2 / fuera de la ruta crítica** | Su propia ficha: base "cerca del azar" sin ajuste fino (0.362), sale sobreconfiada, sin validación médica. OpenAI + scoring LR ya cubren lo mismo |
| **Jetson Orin Nano Super** | **P2**: "modo edge" solo si sobra tiempo | Whisper en CPU tarda 20–30 s; requiere CUDA y JetPack 6.2.2. La demo corre en laptop |
| Stack | FastAPI + React/Vite/Tailwind/Motion (docs/STACK.md) | Ya verificado de punta a punta |

## 10. Alcance

- **Fuera:** login, pagos, multiusuario, datos de pacientes reales, diagnóstico clínico validado, capa profunda fuera del cluster.
- **Simulado con etiqueta `demo_data`:** respuestas OpenAI grabadas si falla la red; la comparación 10× es una estimación con supuestos explícitos.
- **UI [Recomendación]:** en inglés (jueces globales), dictado en ES y EN.
- **Ética:** solo casos publicados, aviso permanente de que no es diagnóstico, se distingue preclínico de clínico, y no se recomienda tratamiento: el paso siempre es "pregunta/prueba/contacto".

## 11. Hechos citables (verificados el 3 oct 2026)

| Hecho | Fuente |
|---|---|
| Diagnóstico promedio 4.7 años; 56% > 6 meses; 6,507 personas, 1,675 enfermedades, 41 países | EURORDIS Rare Barometer, Eur J Hum Genet 2024 — https://www.nature.com/articles/s41431-024-01604-z |
| Pompe tardío se diagnostica mal como LGMD; DBS recomendado en miopatía proximal no clasificada / hiperCKemia | https://www.sciencedirect.com/science/article/abs/pii/S0960896615001339 · https://www.sciencedirect.com/science/article/abs/pii/S1096719213002734 |
| Retraso diagnóstico en Pompe tardío **[Por validar: cifra exacta]** | https://ojrd.biomedcentral.com/articles/10.1186/s13023-024-03425-1 |
| BBP-418: NDA aceptada con revisión prioritaria, PDUFA 27 nov 2026; sería la primera terapia para cualquier LGMD | https://investor.bridgebio.com/news/news-details/2026/BridgeBio-Announces-FDA-Acceptance-and-Priority-Review-of-NDA-for-BBP-418-for-LGMD2IR9/default.aspx |
| ISPD/CRPPA produce CDP-ribitol que usan FKTN y FKRP (mecanismo compartido) | https://www.nature.com/articles/ncomms11534 |
| Ribitol restaura alfa-DG glicosilado en ratón FKRP (preclínico) | https://www.nature.com/articles/s41467-018-05990-z |
| Global FKRP Registry, > 300 pacientes LGMD R9 | https://clinicaltrials.gov/study/NCT04001595 · https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7261761/ |
| Estudio de historia natural GRASP en LGMD R9 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11822816/ |
| Organizaciones: International Pompe Association (> 50 grupos), CureLGMD2i, LGMD Awareness Foundation | https://worldpompe.org/ · https://curelgmd2i.com/ · https://www.lgmd-info.org/ |
| Método LR por fenotipo (LIRICAL) | https://lirical.readthedocs.io/en/latest/phenotype-score.html |
| phenopacket-store 0.1.27: casos publicados con diagnóstico (cohorte GAA: 10) | https://github.com/monarch-initiative/phenopacket-store |
| Orphadata Science CC BY 4.0 | https://sciences.orphadata.com/ |
| Transcripción OpenAI en vivo (`gpt-live-transcribe`, ES/EN, `keywords`) | https://developers.openai.com/api/docs/guides/realtime-transcription |
| Laya: limitaciones de su ficha | https://huggingface.co/convaiinnovations/laya |

## 12. Propuesta de backlog para `/hack-plan` (olas paralelas)

| Ola | ID | Tarea | Tipo | Prio | Depende | Archivos |
|---|---|---|---|---|---|---|
| 0 | HACK-001 | Setup FastAPI + React (docs/STACK.md) + sigma.js + init-smoke | setup | P0 | — | dueño de lockfiles, main, App |
| 1 | HACK-002 | Contrato `app/schemas/` + fixtures del caso + `web/DESIGN.md` (constelación oscura) | contract | P0 | — | app/schemas/, app/fixtures/, web/DESIGN.md, web/src/index.css |
| 1 | HACK-003 | `data/fetch.sh` + `data/build.py`: HPO/hpoa → enfermedades, propagación, IC, layout → JSON | spike+data | P0 | — | data/, app/fixtures/graph*.json |
| 1 | HACK-004 | Spike OpenAI: transcripción en vivo + extracción estructurada ES/EN sobre el caso (20 min) | spike | P0 | — | spikes/openai/ |
| 1 | HACK-005 | Grafo overview con poda por score (mock de scores) | feature | P0 | — | web/src/features/graph/, app/routers/graph.py |
| 2 | HACK-006 | Scoring LR con propagación + next-question + tests sobre el caso | feature | P0 | 003 | app/services/scoring.py, app/routers/diagnose.py, app/tests/test_scoring.py |
| 2 | HACK-007 | Dictado → chips HPO (OpenAI + buscador local de sinónimos) | feature | P0 | 004 | web/src/features/dictation/, app/routers/symptoms.py |
| 2 | HACK-008 | Capa profunda curada: aristas con cita, grupos, activos (CT.gov/RePORTER) | data | P0 | 002 | app/fixtures/deep/, data/curate/ |
| 3 | HACK-009 | Panel de nodo/arista + "explicar para la familia" | feature | P0 | 006, 008 | web/src/features/inspector/, app/routers/node.py |
| 3 | HACK-010 | Vista de acción de Maria + línea de tiempo 10× con supuestos | feature | P0 | 008 | web/src/features/action/, app/routers/action.py |
| 3 | HACK-011 | Validación retrospectiva phenopacket-store → métrica en README y UI | feature | P1 | 006 | data/validate.py, app/fixtures/validation.json |
| 3 | HACK-012 | Gestos MediaPipe (P1) | feature | P1 | 005 | web/src/features/gestures/ |
| 4 | HACK-013 | Demo: ensayo, video plan B, README, pitch con §11 | demo | P0 | 009, 010 | README.md, docs/demo/ |
| — | HACK-014 | Laya / Jetson modo edge | spike | P2 | — | spikes/edge/ |

Relacionadas: 002↔005/006/007/009/010 (contrato), 003↔006, 006↔009/011, 008↔009/010.

## 13. Decisiones abiertas

- [ ] Caso exacto de `phenopacket-store` (cohorte GAA) y su transcripción.
- [ ] Umbral de "sin ruta soportada" (lo fija HACK-011).
- [ ] Nombre final (¿"Constellation"?) e idioma de la UI.
- [ ] Equipo: quién toma backend, datos, frontend/grafo y demo/pitch.
- [ ] Clave de OpenAI del equipo (quién la tiene; nunca en el repo: `.env`).
