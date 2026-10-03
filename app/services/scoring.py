"""Scoring por razón de verosimilitud de fenotipos (IDEA.md §5). El número nunca sale del LLM.

Misma semántica que el generador de ejemplos de HACK-002 (app/fixtures/api/generate.py):
- coincidencia por jerarquía: anotación exacta; si no, la frecuencia conocida más alta entre
  anotaciones ancestro o descendiente del término;
- sin anotación, o con frecuencia desconocida → frecuencia de fondo (LR = 1, neutral);
- negado: LR = (1 − p) / (1 − fondo); prior uniforme sobre todas las enfermedades.
Datos: app/fixtures/graph/annotations.json (HACK-003, HPO v2026-09-01).
"""

import json
import math
import random
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

GRAPH = Path(__file__).resolve().parent.parent / "fixtures" / "graph"
DRAWS = 64
SEED = 7668832
DISCLAIMER = "Phenotype match, not a diagnosis or clinical probability."
METHOD = "HPO phenotype likelihood ratios; uniform disease prior; hierarchy-aware"
RANGE_KIND = f"90% frequency-sensitivity envelope, {DRAWS} seeded draws; not a calibrated confidence interval"
# Punto medio de cada banda de frecuencia HPO (data/build.py) → intervalo que se muestrea para el rango.
BANDS = {0.895: (0.8, 0.99), 0.545: (0.3, 0.79), 0.17: (0.05, 0.29), 0.025: (0.01, 0.04)}


def clip(value: float) -> float:
    return max(1e-6, min(1 - 1e-6, value))


def entropy(p: float) -> float:
    p = clip(p)
    return -p * math.log2(p) - (1 - p) * math.log2(1 - p)


class Scorer:
    def __init__(self, annotations: dict, overview: dict):
        self.diseases: dict = annotations["diseases"]
        self.ancestors = {t: frozenset(a) for t, a in annotations["ancestors"].items()}
        self.labels: dict = annotations["labels"]
        self.names = {n["id"]: n["name"] for n in overview["nodes"]}
        self.sources = overview["sources"]
        self.ids = sorted(self.diseases)
        self.index = {d: i for i, d in enumerate(self.ids)}
        self.descendants = defaultdict(set)
        for term, parents in self.ancestors.items():
            for parent in parents:
                self.descendants[parent].add(term)
        self.by_term = defaultdict(list)  # hpo_id → [(disease, freq|None)]
        for disease, terms in self.diseases.items():
            for term, freq in terms.items():
                self.by_term[term].append((disease, freq))
        self._columns: dict = {}

    def column(self, term: str) -> dict:
        """disease → (frecuencia, término anotado) para las enfermedades con coincidencia conocida."""
        if term not in self._columns:
            exact = {d: f for d, f in self.by_term.get(term, [])}
            related = defaultdict(list)
            for other in self.descendants.get(term, set()) | self.ancestors.get(term, frozenset()):
                for disease, freq in self.by_term.get(other, []):
                    if freq is not None and disease not in exact:
                        related[disease].append((freq, other))
            column = {d: (f, term) for d, f in exact.items() if f is not None}
            column.update({d: max(rows) for d, rows in related.items()})
            self._columns[term] = column
        return self._columns[term]

    def background(self, column: dict) -> float:
        return clip(sum(f for f, _ in column.values()) / len(self.ids))

    @staticmethod
    def ratio(p: float, background: float, present: bool) -> float:
        return p / background if present else (1 - p) / (1 - background)

    def _normalized(self, logs: dict) -> dict:
        """Softmax sobre todas las enfermedades; las que no aparecen en `logs` valen 0."""
        largest = max([0.0, *logs.values()])
        base = math.exp(-largest)
        total = base * (len(self.ids) - len(logs)) + sum(math.exp(v - largest) for v in logs.values())
        return {"_rest": 100 * base / total, **{d: 100 * math.exp(v - largest) / total for d, v in logs.items()}}

    def diagnose(self, terms: list) -> dict:
        columns = [self.column(t["hpo_id"]) for t in terms]
        backgrounds = [self.background(c) for c in columns]
        logs, drivers = defaultdict(float), defaultdict(dict)
        for term, column, background in zip(terms, columns, backgrounds):
            for disease, (freq, annotated) in column.items():
                ratio = self.ratio(clip(freq), background, term["present"])
                logs[disease] += math.log(ratio)
                drivers[disease][term["hpo_id"]] = (ratio, annotated)
        pct = self._normalized(logs)
        rest = pct.pop("_rest")
        order = sorted(self.ids, key=lambda d: (-pct.get(d, rest), d))[:10]

        rng = random.Random(SEED + len(terms))
        samples = defaultdict(list)
        for _ in range(DRAWS):
            draw = defaultdict(float)
            for term, column, background in zip(terms, columns, backgrounds):
                for disease, (freq, _) in column.items():
                    low, high = BANDS.get(freq, (freq, freq))
                    draw[disease] += math.log(self.ratio(clip(rng.uniform(low, high)), background, term["present"]))
            values = self._normalized(draw)
            for disease in order:
                samples[disease].append(values.get(disease, values["_rest"]))

        ranking = []
        for disease in order:
            value, band = round(pct.get(disease, rest), 6), sorted(samples[disease])
            ranking.append({
                "disease_id": disease, "name": self.names.get(disease, disease), "pct": value,
                "low": round(min(value, band[int(0.05 * (DRAWS - 1))]), 6),
                "high": round(max(value, band[int(0.95 * (DRAWS - 1))]), 6),
                "drivers": self._drivers(terms, drivers[disease]),
            })
        return {
            "schema_version": "1.0", "demo_data": False, "sources": self.sources, "ranking": ranking,
            "next_question": None, "total_diseases": len(self.ids),
            "other_pct": round(100 - sum(r["pct"] for r in ranking), 6), "terms_used": len(terms),
            "method": METHOD, "range_kind": RANGE_KIND, "disclaimer": DISCLAIMER,
        }

    def _drivers(self, terms: list, matched: dict) -> list:
        items = []
        for term in terms:
            ratio, annotated = matched.get(term["hpo_id"], (1.0, None))
            log_lr = math.log(ratio)
            items.append({
                "hpo_id": term["hpo_id"], "label": term["label"], "present": term["present"],
                "likelihood_ratio": round(ratio, 8), "log_lr": round(log_lr, 8),
                "direction": "supports" if log_lr > 1e-8 else "against" if log_lr < -1e-8 else "neutral",
                "annotation_hpo_id": annotated, "source": "HPO phenotype.hpoa v2026-09-01" if annotated else None,
            })
        return sorted(items, key=lambda item: -abs(item["log_lr"]))[:3]

    def next_question(self, terms: list, candidates: list) -> dict:
        base = {"schema_version": "1.0", "demo_data": False, "sources": self.sources, "candidates": candidates}
        asked = {t["hpo_id"] for t in terms}
        possible = sorted({t for d in candidates for t in self.diseases.get(d, {})} - asked)
        best = None
        if len(candidates) == 2:
            for term in possible:
                column = self.column(term)
                background = self.background(column)
                p, q = (clip(column[d][0]) if d in column else background for d in candidates)
                gain = max(0.0, entropy((p + q) / 2) - (entropy(p) + entropy(q)) / 2)
                if best is None or gain > best[0]:
                    best = gain, term, p, q
        if best is None or best[0] < 1e-8:
            return {**base, "hpo_id": None, "label": None, "information_gain_bits": 0,
                    "question": "No supported question separates these candidates.", "if_yes": "", "if_no": "",
                    "rationale": "Insufficient discriminating annotations."}
        gain, term, p, q = best
        yes, no = (candidates[0], candidates[1]) if p > q else (candidates[1], candidates[0])
        return {**base, "hpo_id": term, "label": self.labels[term], "information_gain_bits": round(gain, 6),
                "question": f"Is there {self.labels[term].lower()}?", "if_yes": yes, "if_no": no,
                "rationale": "Maximum binary information gain with equal weights for the two candidates; "
                             "missing is neutral."}


@lru_cache(maxsize=1)
def get_scorer() -> Scorer:
    annotations = json.loads((GRAPH / "annotations.json").read_text(encoding="utf-8"))
    overview = json.loads((GRAPH / "overview.json").read_text(encoding="utf-8"))
    return Scorer(annotations, overview)
