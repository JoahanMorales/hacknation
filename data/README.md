# Datos · HPO → grafo de la constelación

```bash
bash data/fetch.sh            # hp.json + phenotype.hpoa v2026-09-01 → data/raw/ (ignorado por Git, ~57 MB)
python3 data/build.py         # → app/fixtures/graph/overview.json + annotations.json (~5 s)
python3 data/build.py --check # valida sin reescribir; con data/raw/ también comprueba que el build es reproducible
```

Sólo biblioteca estándar de Python 3.8+; la salida es determinista (mismos crudos, mismos bytes).

## Fuentes

| Archivo | Origen | Licencia |
|---|---|---|
| `hp.json` | [HPO release v2026-09-01](https://github.com/obophenotype/human-phenotype-ontology/releases/tag/v2026-09-01) | HPO license (uso libre con atribución) |
| `phenotype.hpoa` | mismo release (anotaciones OMIM, Orphanet y DECIPHER) | ídem |

Filtro: `aspect = P` (fenotipo), `qualifier ≠ NOT` y términos bajo *Phenotypic abnormality* (`HP:0000118`). Resultado: 12,867 enfermedades.

## `overview.json` (lo sirve `GET /api/graph/overview`, ~1.5 MB)

```json
{"source": {"hpo": "v2026-09-01", "diseases": 12867},
 "groups": [{"id": "HP:0000707", "label": "Nervous system", "count": 3633, "x": 0.0, "y": 0.0, "r": 281.1}],
 "nodes": [{"id": "ORPHA:34515", "name": "FKRP-related limb-girdle muscular dystrophy R9",
               "group": "HP:0033127", "x": -355.9, "y": 171.7, "n": 17}]}
```

- `group`: sistema HPO raíz (hijo de `HP:0000118`) con más anotaciones de la enfermedad. Cada grupo es una galaxia: centro `x, y` y radio `r` para su etiqueta.
- Dentro de cada galaxia, cúmulos por el subsistema dominante (nieto del sistema); en cada cúmulo, espiral de girasol con las enfermedades de más fenotipos al centro.
- `n`: número de fenotipos anotados (sirve para el tamaño de la estrella).
- Coordenadas en unidades abstractas (~1,500 de ancho); sigma las escala.

## `annotations.json` (sólo backend, ~7.8 MB)

| Clave | Contenido |
|---|---|
| `diseases` | `disease_id → {hpo_id: freq}`. `freq` ∈ [0, 1] o `null` = frecuencia **desconocida** (no es ausencia). Varias fuentes se promedian. |
| `ancestors` | `hpo_id → [ancestros propios bajo HP:0000118]`, para todos los fenotipos. Un término observado coincide con anotaciones de sus ancestros y de sus descendientes (IDEA.md §5). |
| `background` | `hpo_id → fracción de enfermedades anotadas con el término o un descendiente` (P(t\|¬D) aproximada). Si falta, usar `1/diseases`. |

Frecuencias HPO → punto medio del intervalo: Obligate 1.0 · Very frequent 0.895 · Frequent 0.545 · Occasional 0.17 · Very rare 0.025 · Excluded 0. `n/m` y `x%` se usan tal cual.

Los IDs se guardan como `HP:0001234` legibles aunque pesen más: con enteros bajaría a ~4.7 MB, pero los consumidores (HACK-007, HACK-012, HACK-002) tendrían que convertir. En Git ocupa ~1.1 MB comprimido.
