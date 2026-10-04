"""Búsqueda global (HACK-021): una caja abre el atlas desde enfermedad, gen, síntoma, mecanismo, grupo o activo.

Índice en memoria de nombres y sinónimos normalizados (minúsculas, sin acentos). Ranking: coincidencia exacta >
prefijo del nombre > todos los términos de la consulta como prefijos de palabras > coincidencia parcial. Un
glosario mínimo ES→EN permite buscar síntomas en español ("creatina quinasa"): HPO sólo trae sinónimos en inglés.
"""

import json
import math
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GRAPH = ROOT / "app" / "fixtures" / "graph"
DEEP = ROOT / "app" / "fixtures" / "deep" / "deep.json"

TYPES = ("disease", "gene", "symptom", "mechanism", "group", "asset")
PER_TYPE = 6
# Prioridad entre tipos ante el mismo puntaje: lo que Maria suele buscar primero.
TYPE_BONUS = {"disease": 3, "gene": 4, "mechanism": 4, "group": 4, "asset": 2, "symptom": 0}
GLOSSARY_ES = {
    "creatina": "creatine", "quinasa": "kinase", "cinasa": "kinase", "elevada": "elevated", "elevado": "elevated",
    "debilidad": "weakness", "muscular": "muscle", "musculo": "muscle", "fatiga": "fatigue", "dolor": "pain",
    "presion": "pressure", "inspiratoria": "inspiratory", "espiratoria": "expiratory", "maxima": "maximal",
    "reducida": "reduced", "reducido": "reduced", "cardiomiopatia": "cardiomyopathy", "cardiomegalia": "cardiomegaly",
    "pantorrilla": "calf", "pantorrillas": "calf", "hipertrofia": "hypertrophy", "escaleras": "stairs",
    "dificultad": "difficulty", "subir": "climbing", "respiratoria": "respiratory", "insuficiencia": "insufficiency",
    "distrofia": "dystrophy", "cinturas": "girdle", "enfermedad": "disease", "convulsiones": "seizures",
}
# Abreviaturas clínicas frecuentes al dictar o buscar ("elevated CK" → creatine kinase).
ABBREVIATIONS = {"ck": "creatine kinase", "cpk": "creatine phosphokinase", "mip": "maximal inspiratory pressure",
                 "mep": "maximal expiratory pressure", "lgmd": "limb girdle muscular dystrophy"}
STOP = frozenset(("of", "the", "and", "a", "an", "de", "la", "el", "y", "del", "with", "in"))


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def tokens(text: str) -> list[str]:
    return [t for t in normalize(text).split() if t not in STOP]


@dataclass
class Entry:
    type: str
    id: str
    label: str
    disease_ids: list[str]
    boost: float = 0.0  # síntomas frecuentes en las anotaciones suben un poco (el término general antes que el raro)
    names: list[str] = field(default_factory=list)  # nombres normalizados (label + sinónimos)
    raw_names: list[str] = field(default_factory=list)
    curated: bool = False


class SearchIndex:
    def __init__(self, overview: dict, annotations: dict, deep: dict):
        self.entries: list[Entry] = []
        names = {n["id"]: n["name"] for n in overview["nodes"]}
        curated = {d["id"]: d for d in deep["diseases"]}
        for disease_id, name in names.items():
            synonyms = curated.get(disease_id, {}).get("synonyms", [])
            self._add(Entry("disease", disease_id, name, [disease_id], curated=disease_id in curated),
                      [name, disease_id, *synonyms])
        for symbol, gene in ((g["symbol"], g) for g in deep["genes"]):
            self._add(Entry("gene", symbol, symbol, gene["disease_ids"], curated=True), [symbol])
        for mechanism in deep["mechanisms"]:
            diseases = [d["id"] for d in deep["diseases"] if mechanism["id"] in d["mechanism_ids"]]
            family = mechanism["id"].split(".")[-1].replace("_", " ")
            self._add(Entry("mechanism", mechanism["id"], mechanism["name"], diseases, curated=True),
                      [mechanism["name"], family, *mechanism["gene_symbols"]])
        for group in deep["patient_groups"]:
            self._add(Entry("group", group["name"], group["name"], group["diseases"], curated=True), [group["name"]])
        for asset in deep["assets"]:
            self._add(Entry("asset", asset["id"], asset["name"], deep["asset_diseases"].get(asset["id"], []),
                            curated=True), [asset["name"], asset["id"]])
        background = annotations.get("background", {})
        for hpo_id, label in annotations["labels"].items():
            boost = 3 * math.log10(1 + 1000 * background.get(hpo_id, 0.0))
            self._add(Entry("symptom", hpo_id, label, [], boost=boost),
                      [label, hpo_id, *annotations.get("synonyms", {}).get(hpo_id, [])])
        # Sólo IDs con prefijo y número (OMIM:…, ORPHA:…, HP:…, NCT…); genes y grupos usan su nombre como id.
        self.by_id = {normalize(e.id): i for i, e in enumerate(self.entries)
                      if e.type in ("disease", "symptom", "asset") and re.search(r"\d", e.id)}
        # Índice invertido: palabra → entradas que la contienen (para buscar por prefijo sin recorrer todo).
        self.by_token: dict[str, set[int]] = defaultdict(set)
        for index, entry in enumerate(self.entries):
            for name in entry.names:
                for token in name.split():
                    self.by_token[token].add(index)
        self.vocabulary = sorted(self.by_token)

    def _add(self, entry: Entry, names: list[str]) -> None:
        seen = set()
        for raw in names:
            norm = normalize(raw)
            if norm and norm not in seen:
                seen.add(norm)
                entry.names.append(norm)
                entry.raw_names.append(raw)
        self.entries.append(entry)

    def _candidates(self, query_tokens: list[str]) -> set[int]:
        found: set[int] = set()
        for q in query_tokens:
            for token in self.vocabulary:
                if token.startswith(q):
                    found |= self.by_token[token]
        return found

    def search(self, query: str, limit: int = 20) -> list[dict]:
        q_norm = normalize(query)
        q_tokens = tokens(query)
        if not q_tokens:
            return []
        if q_norm in self.by_id:  # OMIM:621314, HP:0003236, NCT04001595: respuesta directa
            entry = self.entries[self.by_id[q_norm]]
            return [{"type": entry.type, "id": entry.id, "label": entry.label, "matched": entry.id,
                     "disease_ids": entry.disease_ids, "score": 100.0}]
        # Glosario ES→EN: se buscan ambas formas y se queda la mejor.
        translated = [GLOSSARY_ES.get(t, t) for t in q_tokens]
        expanded = [w for t in translated for w in ABBREVIATIONS.get(t, t).split()]
        variants = [(q_norm, q_tokens)]
        for alternative in (translated, expanded):
            if alternative != q_tokens and (" ".join(alternative), alternative) not in variants:
                variants.append((" ".join(alternative), alternative))
        scored: dict[int, tuple[float, str]] = {}
        for norm, toks in variants:
            for index in self._candidates(toks):
                entry = self.entries[index]
                best = (0.0, "")
                for name, raw in zip(entry.names, entry.raw_names):
                    words = name.split()
                    if name == norm:
                        score = 100.0
                    elif name.startswith(norm):
                        score = 85.0 - min(len(name) - len(norm), 30) / 3
                    else:
                        hits = sum(any(w.startswith(t) for w in words) for t in toks)
                        if hits == 0:
                            continue
                        coverage = hits / len(toks)
                        score = (70.0 if coverage == 1 else 40.0 * coverage) - min(len(words), 20) / 2
                    if score > best[0]:
                        best = (score, raw)
                if best[0] > 0:
                    score = best[0] + TYPE_BONUS[entry.type] + (4 if entry.curated else 0) + entry.boost
                    if score > scored.get(index, (0.0, ""))[0]:
                        scored[index] = (score, best[1])
        ranked = sorted(scored.items(), key=lambda kv: (-kv[1][0], len(self.entries[kv[0]].label)))
        per_type: dict[str, int] = defaultdict(int)
        results = []
        for index, (score, matched) in ranked:
            entry = self.entries[index]
            if per_type[entry.type] >= PER_TYPE:
                continue
            per_type[entry.type] += 1
            results.append({"type": entry.type, "id": entry.id, "label": entry.label, "matched": matched,
                            "disease_ids": entry.disease_ids, "score": round(score, 1)})
            if len(results) >= limit:
                break
        return results


@lru_cache(maxsize=1)
def get_index() -> SearchIndex:
    overview = json.loads((GRAPH / "overview.json").read_text(encoding="utf-8"))
    annotations = json.loads((GRAPH / "annotations.json").read_text(encoding="utf-8"))
    deep = json.loads(DEEP.read_text(encoding="utf-8"))
    return SearchIndex(overview, annotations, deep)
