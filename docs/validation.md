# Validación retrospectiva del scoring

> Validación retrospectiva sobre casos publicados, **no prueba clínica**. Generado por `data/validate.py`.

## Resultado

| Cohorte | n | top-1 | top-3 | top-10 |
|---|---|---|---|---|
| GAA (Pompe, todos) | 10 | 60% | 60% | 60% |
| Muestra aleatoria (semilla 7668832) | 200 | 42% | 46% | 51% |
| Total | 210 | 42% | 47% | 51% |

## Método

- Fuente: phenopacket-store 0.1.27 (https://github.com/monarch-initiative/phenopacket-store/releases/download/0.1.27/all_phenopackets.zip), BSD-3.
- Casos: la cohorte GAA completa y una muestra de 200 del resto con un único diagnóstico que existe en el grafo de 12,867 enfermedades.
- Entrada: los términos HPO publicados de cada caso; `excluded` cuenta como ausente. Términos fuera de `hp.json` v2026-09-01 se ignoran.
- Salida: posición del diagnóstico publicado en el ranking puntual de `app/services/scoring.py` (LR por fenotipo, prior uniforme, jerarquía HPO).
- Descartados: diagnosis outside the 12,867-disease graph: 29.

## Umbral "sin ruta soportada"

Regla: unsupported if fewer than 3 known terms or top-1 pct below the recommended cut. Corte recomendado: **10%** (mayor corte que deja al menos 75% de los casos con ruta; debajo, el top-3 cae y conviene preguntar más síntomas). Casos con menos de 3 términos: n=5, top-3 0%.

| top-1 pct < | n debajo | top-3 debajo | n encima | top-3 encima |
|---|---|---|---|---|
| 1% | 13 | 0% | 197 | 50% |
| 5% | 31 | 10% | 179 | 54% |
| 10% | 45 | 16% | 165 | 56% |
| 20% | 65 | 17% | 145 | 61% |
| 30% | 82 | 18% | 128 | 66% |
| 50% | 119 | 26% | 91 | 75% |

## Límites

- Circularidad: `phenotype.hpoa` incorpora anotaciones de publicaciones, y parte de estos casos pudo alimentarlas; el resultado es optimista frente a pacientes nuevos.
- Los casos publicados suelen ser más completos que una primera consulta; no mide el caso dictado.
- El porcentaje es coincidencia fenotípica normalizada, no probabilidad clínica.
- El corte de pct no basta solo: el caso de demo PMID_7668832_Father es top-1 correcto con 3.8%; combínalo con el número de términos o el margen sobre el 2.º antes de mostrar "sin ruta".
