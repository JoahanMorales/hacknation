# Clusters por fenotipo

> Generado por `data/similarity.py`. Similitud fenotípica, no diagnóstico ni parentesco causal.

## Método

- Perfil = fenotipos HPO anotados en `phenotype.hpoa` (frecuencia 0 se ignora) + sus ancestros.
- IC(t) = −ln(fracción de enfermedades cuyo perfil contiene t): un fenotipo raro pesa más que uno común.
- Similitud = Σ IC compartido / Σ IC de la unión (Jaccard ponderado, 0–1).
- Top-10 por enfermedad para las 12,867 del atlas; candidatos = comparten un fenotipo con IC ≥ 3.0 (< 5% del atlas). La poda usa una cota superior exacta: 100/100 enfermedades al azar dan el mismo top-10 que la búsqueda exhaustiva. `--check` recalcula una muestra con semilla.
- Distroglicanopatía (para la evidencia) = el nombre menciona el alfa-distroglicano o un gen de su glicosilación (FKRP, FKTN, POMT1, POMT2, POMGNT1, POMGNT2, LARGE1, CRPPA, ISPD, B3GALNT2, B4GAT1, RXYLT1, TMEM5, POMK, GMPPB, DPM1, DPM2, DPM3, DOLK, DAG1).

## Evidencia: LGMD R9 (FKRP, ORPHA:34515)

**6 de 10** vecinos son distroglicanopatías, frente a **0.03** esperadas por azar (42 distroglicanopatías en 12,867 enfermedades; p hipergeométrica = 1.5e-13).

| # | Vecino | Similitud | ¿Distroglicanopatía? |
|---|---|---|---|
| 1 | Muscular dystrophy-dystroglycanopathy (limb-girdle), type C, 1 (`OMIM:609308`) | 0.431 | sí |
| 2 | Muscular dystrophy, limb-girdle, type 2F (`OMIM:601287`) | 0.399 | no |
| 3 | Muscular dystrophy-dystroglycanopathy (limb-girdle), type C, 5 (`OMIM:607155`) | 0.397 | sí |
| 4 | Alpha-dystroglycan-related limb-girdle muscular dystrophy R16 (`ORPHA:280333`) | 0.392 | sí |
| 5 | Muscular dystrophy-dystroglycanopathy (limb-girdle), type C, 4 (`OMIM:611588`) | 0.391 | sí |
| 6 | Duchenne muscular dystrophy (`ORPHA:98896`) | 0.377 | no |
| 7 | Muscular dystrophy-dystroglycanopathy (limb-girdle), type C, 3 (`OMIM:613157`) | 0.360 | sí |
| 8 | POMT2-related limb-girdle muscular dystrophy R14 (`ORPHA:206559`) | 0.358 | sí |
| 9 | Beta-sarcoglycan-related limb-girdle muscular dystrophy R4 (`ORPHA:119`) | 0.356 | no |
| 10 | Muscular dystrophy, limb-girdle, type 2D (`OMIM:608099`) | 0.348 | no |

## Contraejemplo: Pompe tardío (OMIM:621314)

Fenotipo parecido, mecanismo distinto: Pompe queda en el puesto **217** para LGMD R9 (similitud 0.129) porque comparte debilidad proximal y CK alta, pero su mecanismo curado es `lysosomal.glycogen` frente a `glycosylation.ribitol`. Por eso la similitud fenotípica sirve para el diferencial y la colaboración, no para transferir tratamientos.

Fenotipos compartidos más informativos: Difficulty climbing stairs (IC 4.96); Elevated circulating creatine kinase activity (IC 3.28); Abnormal appendicular muscle morphology (IC 2.69); Muscle weakness (IC 2.08).

## Límites

- Las anotaciones son de la literatura y desiguales: enfermedades poco descritas tienen vecinos menos fiables.
- Frecuencias no se usan en la similitud (sólo presencia); la ausencia no anotada no es ausencia real.
