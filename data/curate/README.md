# Capa profunda curada (HACK-009)

```bash
python3 data/curate/build.py --refresh   # ClinicalTrials.gov API v2 + NIH RePORTER → api_snapshot.json → deep.json
python3 data/curate/build.py             # sin red, desde api_snapshot.json
uv run python data/curate/check.py       # nada sin fuente + validación contra app/schemas (python3 sólo hace lo primero)
```

- `curated.json`: lo único escrito a mano. Cada mecanismo y arista cita su URL; IDs y genes verificados contra HPO v2026-09-01 (`phenotype.hpoa`, `genes_to_disease.txt`). Verificado el 2026-10-03.
- `app/fixtures/deep/deep.json`: `diseases` (con x/y/grupo del grafo de HACK-003), `genes`, `mechanisms`, `edges`, `patient_groups`, `assets` (+ `asset_diseases`, `asset_status`), `research` (NIH RePORTER).
- Mecanismos con prefijo de familia para el color del brief: `glycosylation.*`, `lysosomal.*`, `structural.*`, `membrane.*`.

## Nivel de evidencia (honesto)

| Arista | Nivel | Por qué |
|---|---|---|
| Ruta ribitol FKRP–FKTN–CRPPA (E01–E03) | observado | Bioquímica: CRPPA hace CDP-ribitol que usan FKTN y FKRP (Nat Commun 2016). |
| Puente terapéutico FKRP → CRPPA (E04) | inferido | Profármaco de CDP-ribitol en ratón *Ispd* (Nat Commun 2022): preclínico. |
| Puente terapéutico FKRP → FKTN (E05) | hipotesis | No se encontró estudio preclínico de ribitol en FKTN (búsqueda 2026-10-03). |
| FKRP LGMD R9 vs. congénita (E06) | observado | Serie alélica: mismo gen, distinto cuadro; no fusionar nodos. |
| Pompe tardío vs. LGMD R9 (E07) | observado | Pompe aparece en cohortes de LGMD sin clasificar. |
| Pompe vs. LGMD R1/R2/R12 (E08–E10) | inferido | La fuente habla de LGMD sin clasificar, no de cada gen. |

El ribitol sólo tiene evidencia clínica en FKRP: BBP-418 (NCT04800874, NCT05775848, NCT07678775) y NDA con revisión prioritaria, PDUFA 2026-11-27.
