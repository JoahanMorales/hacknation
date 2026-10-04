"""Vecinos fenotípicos precalculados (data/similarity.py) + los fenotipos que los explican.

Los vecinos y su `score` salen del fixture; los fenotipos compartidos se recalculan aquí con el mismo perfil
(anotaciones + ancestros) e IC que el build, reutilizando las anotaciones ya cargadas por el scorer.
"""

import json
import math
from collections import Counter
from functools import lru_cache
from pathlib import Path

from app.services.scoring import get_scorer

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
NEIGHBORS = FIXTURES / "similarity" / "neighbors.json"
DEEP = FIXTURES / "deep" / "deep.json"
SHARED_LIMIT = 8
DISCLAIMER = "Phenotype similarity, not a diagnosis, shared cause or treatment transfer."


class UnknownDisease(LookupError):
    pass


@lru_cache(maxsize=1)
def neighbors_fixture() -> dict:
    return json.loads(NEIGHBORS.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def profiles() -> tuple[dict, dict]:
    """(disease → perfil propagado, hpo → IC), igual que data/similarity.py."""
    scorer = get_scorer()
    profile = {}
    for disease, terms in scorer.diseases.items():
        observed = {t for t, freq in terms.items() if freq != 0 and t in scorer.ancestors}
        profile[disease] = frozenset(observed.union(*(scorer.ancestors[t] for t in observed)))
    counts = Counter(t for p in profile.values() for t in p)
    total = len(profile)
    return profile, {t: -math.log(c / total) for t, c in counts.items()}


@lru_cache(maxsize=1)
def curated() -> tuple[dict, dict]:
    """(disease → mecanismos curados, disease → genes curados) de la capa profunda."""
    deep = json.loads(DEEP.read_text(encoding="utf-8"))
    mechanisms = {d["id"]: set(d.get("mechanism_ids", [])) for d in deep["diseases"]}
    genes: dict[str, set] = {}
    for gene in deep["genes"]:
        for disease in gene["disease_ids"]:
            genes.setdefault(disease, set()).add(gene["symbol"])
    return mechanisms, genes


def shared_phenotypes(a: str, b: str) -> list:
    """Fenotipos compartidos más informativos, sin repetir un ancestro de otro ya listado."""
    profile, ic = profiles()
    ancestors = get_scorer().ancestors
    shared = profile[a] & profile[b]
    implied = set().union(*(ancestors.get(t, ()) for t in shared))
    specific = sorted(shared - implied, key=lambda t: (-ic[t], t))[:SHARED_LIMIT]
    labels = get_scorer().labels
    return [{"hpo_id": t, "label": labels.get(t, t), "ic": round(ic[t], 2)} for t in specific]


def curated_overlap(a: str, b: str) -> dict | None:
    """Gen/mecanismo curado en común; None si alguna de las dos está fuera de la capa curada."""
    mechanisms, genes = curated()
    if a not in mechanisms or b not in mechanisms:
        return None
    return {
        "genes": sorted(genes.get(a, set()) & genes.get(b, set())),
        "mechanisms": sorted(mechanisms[a] & mechanisms[b]),
        "same_family": sorted({m.split(".")[0] for m in mechanisms[a]} & {m.split(".")[0] for m in mechanisms[b]}),
    }


def similar(disease_id: str, k: int) -> dict:
    data = neighbors_fixture()
    if disease_id not in data["neighbors"]:
        raise UnknownDisease(f"{disease_id} is not in the phenotype atlas")
    names = get_scorer().names
    return {
        "schema_version": "1.0",
        "demo_data": False,
        "disease_id": disease_id,
        "name": names.get(disease_id, disease_id),
        "method": data["method"],
        "disclaimer": DISCLAIMER,
        "neighbors": [
            {
                "disease_id": other,
                "name": names.get(other, other),
                "score": score,
                "shared": shared_phenotypes(disease_id, other),
                "curated": curated_overlap(disease_id, other),
            }
            for other, score in data["neighbors"][disease_id][:k]
        ],
    }
