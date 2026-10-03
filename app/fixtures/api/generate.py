"""Generate deterministic sample API responses from pinned public inputs.

This is a fixture generator, not the production scorer owned by HACK-007.
Run from any directory: python app/fixtures/api/generate.py --download.
Raw downloads are cached outside tracked fixture paths in .cache/hpo/.
"""

import argparse
import csv
import hashlib
import io
import json
import math
import random
import sys
from collections import defaultdict
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from app.schemas import RESPONSE_MODELS, Case

OUT = Path(__file__).parent
CASE_DIR = OUT.parent / "case"
HPO_RELEASE = "v2026-09-01"
PACKET_RELEASE = "0.1.27"
LAYOUT_COMMIT = "4fded4157b2742811294f9df1e93314fd578a455"
PACKET_FILE = "PMID_7668832_Father.json"
HPO_BASE = (
    "https://github.com/obophenotype/human-phenotype-ontology/releases/download/"
    + HPO_RELEASE
    + "/"
)
PACKET_URL = (
    "https://raw.githubusercontent.com/monarch-initiative/phenopacket-store/"
    + PACKET_RELEASE
    + "/notebooks/GAA/phenopackets/"
    + PACKET_FILE
)
INPUT_URLS = {
    "hp.json": HPO_BASE + "hp.json",
    "phenotype.hpoa": HPO_BASE + "phenotype.hpoa",
    "phenopacket.json": PACKET_URL,
    "overview.json": (
        "https://raw.githubusercontent.com/JoahanMorales/hacknation/"
        + LAYOUT_COMMIT
        + "/app/fixtures/graph/overview.json"
    ),
}
INPUT_HASHES = {
    "hp.json": "a7b3a012e7b4007a35a7cf8da35f2373b54cc16907f80d13d62470d31f833501",
    "phenotype.hpoa": "e89aa39c8f97bf5a52c5d160f9250a603681d630ade8ec2679d84ac5aece1f72",
    "phenopacket.json": "7da518380f65f5d6a4e7b9c6b741a9120be9852e0563c0b6b8d329f0edfc87c3",
    "overview.json": "425d931236cb33d67066e06af3714ac940c2914fcda0130f149ca3750bb87fda",
}
POMPE = "OMIM:621314"
FKRP = "ORPHA:34515"
SEED = 7668832
RETRIEVED_AT = "2026-10-03T00:00:00Z"
FREQUENCY_BANDS = {
    "HP:0040280": (1.0, 1.0),
    "HP:0040281": (0.8, 0.99),
    "HP:0040282": (0.3, 0.79),
    "HP:0040283": (0.05, 0.29),
    "HP:0040284": (0.01, 0.04),
    "HP:0040285": (0.0, 0.0),
}
DISCLAIMER = "Phenotype match, not a diagnosis or clinical probability."


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download(cache):
    cache.mkdir(parents=True, exist_ok=True)
    for filename, url in INPUT_URLS.items():
        path = cache / filename
        if not path.exists():
            with urlopen(url, timeout=120) as response:
                data = response.read()
            # Failed downloads never leave a partial cache file.
            path.write_bytes(data)


def frequency(value):
    """Missing stays missing; preserve genuine zero and count information."""
    if not value:
        return {"mean": None, "kind": "missing"}
    if value in FREQUENCY_BANDS:
        low, high = FREQUENCY_BANDS[value]
        return {"mean": (low + high) / 2, "kind": "band", "low": low, "high": high}
    if "/" in value:
        numerator, denominator = map(int, value.split("/"))
        if denominator <= 0 or not 0 <= numerator <= denominator:
            raise ValueError("Invalid annotation count: " + value)
        return {
            "mean": numerator / denominator,
            "kind": "count",
            "n": numerator,
            "d": denominator,
        }
    mean = float(value.rstrip("%")) / (100 if value.endswith("%") else 1)
    if not 0 <= mean <= 1:
        raise ValueError("Invalid annotation frequency: " + value)
    return {"mean": mean, "kind": "fixed"}


def compact_hpo_id(iri):
    return "HP:" + iri.rsplit("HP_", 1)[1] if "HP_" in iri else None


class Dataset:
    def __init__(self, cache):
        graph = json.loads((cache / "hp.json").read_text(encoding="utf-8"))["graphs"][0]
        self.labels = {
            compact_hpo_id(node["id"]): node["lbl"]
            for node in graph["nodes"]
            if "HP_" in node["id"] and "lbl" in node
        }
        self.parents = defaultdict(set)
        self._ancestors = {}
        self._columns = {}
        for edge in graph["edges"]:
            if edge["pred"] == "is_a":
                child, parent = compact_hpo_id(edge["sub"]), compact_hpo_id(edge["obj"])
                if child and parent:
                    self.parents[child].add(parent)
        self.annotations = defaultdict(list)
        self.names = {}
        self.header = []
        lines = (cache / "phenotype.hpoa").read_text(encoding="utf-8").splitlines()
        self.header = [line for line in lines if line.startswith("#")]
        for row in csv.DictReader(
            io.StringIO("\n".join(line for line in lines if not line.startswith("#"))),
            delimiter="\t",
        ):
            # Preserve all disease namespaces emitted by the real HPO graph.
            if row["aspect"] != "P" or not row["database_id"].startswith(
                ("OMIM:", "ORPHA:", "MONDO:", "DECIPHER:")
            ):
                continue
            disease = row["database_id"]
            self.names[disease] = row["disease_name"]
            f = frequency(row["frequency"])
            if row["qualifier"] == "NOT":
                f = {"mean": 0.0, "kind": "fixed"}
            self.annotations[disease].append(
                {
                    "hpo_id": row["hpo_id"],
                    "frequency": f,
                    "reference": row["reference"],
                }
            )
        self.ids = sorted(self.names)
        if POMPE not in self.names or FKRP not in self.names:
            raise ValueError("Required demo diseases missing from pinned HPO")

    def ancestors(self, hpo_id):
        if hpo_id in self._ancestors:
            return self._ancestors[hpo_id]
        found = set()
        pending = list(self.parents[hpo_id])
        while pending:
            parent = pending.pop()
            if parent not in found:
                found.add(parent)
                pending.extend(self.parents[parent])
        result = frozenset(found)
        self._ancestors[hpo_id] = result
        return result

    def match(self, disease, term):
        rows = self.annotations[disease]
        exact = [row for row in rows if row["hpo_id"] == term]
        candidates = exact or [
            row
            for row in rows
            if term in self.ancestors(row["hpo_id"])
            or row["hpo_id"] in self.ancestors(term)
        ]
        known = [row for row in candidates if row["frequency"]["mean"] is not None]
        # Exact annotations take precedence, including measured absence. Otherwise
        # use the largest compatible frequency, a documented demo approximation.
        return max(known, key=lambda row: row["frequency"]["mean"]) if known else None

    def column(self, term):
        if term not in self._columns:
            self._columns[term] = [self.match(disease, term) for disease in self.ids]
        return self._columns[term]

    def background(self, rows):
        # Missing evidence contributes no count. The denominator is every disease
        # in scope, not just diseases whose phenotype has been studied.
        return clip(
            sum(row["frequency"]["mean"] for row in rows if row) / len(self.ids)
        )


def clip(value):
    return max(1e-6, min(1 - 1e-6, value))


def sampled_frequency(spec, rng):
    if spec["kind"] == "band":
        return clip(rng.uniform(spec["low"], spec["high"]))
    if spec["kind"] == "count":
        # Sensitivity to finite published counts; not a clinical confidence band.
        return clip(rng.betavariate(spec["n"] + 1, spec["d"] - spec["n"] + 1))
    return clip(spec["mean"])


def normalized(log_scores):
    largest = max(log_scores)
    weights = [math.exp(value - largest) for value in log_scores]
    total = sum(weights)
    return [100 * weight / total for weight in weights]


def score(dataset, terms, sources, draws=64):
    columns = [dataset.column(term["hpo_id"]) for term in terms]
    backgrounds = [dataset.background(column) for column in columns]
    totals = [0.0] * len(dataset.ids)
    drivers = [[] for _ in dataset.ids]
    for term, column, background in zip(terms, columns, backgrounds):
        for i, row in enumerate(column):
            probability = clip(row["frequency"]["mean"]) if row else background
            ratio = (
                probability / background
                if term["present"]
                else (1 - probability) / (1 - background)
            )
            log_lr = math.log(ratio)
            totals[i] += log_lr
            drivers[i].append(
                {
                    "hpo_id": term["hpo_id"],
                    "label": term["label"],
                    "present": term["present"],
                    "likelihood_ratio": round(ratio, 8),
                    "log_lr": round(log_lr, 8),
                    "direction": "supports"
                    if log_lr > 1e-8
                    else "against"
                    if log_lr < -1e-8
                    else "neutral",
                    "annotation_hpo_id": row["hpo_id"] if row else None,
                    "source": row["reference"] if row else None,
                }
            )
    percentages = normalized(totals)
    order = sorted(
        range(len(dataset.ids)), key=lambda i: (-percentages[i], dataset.ids[i])
    )[:10]
    bands = {i: [] for i in order}
    rng = random.Random(SEED + len(terms))
    for _ in range(draws):
        logs = [0.0] * len(dataset.ids)
        for term, column, background in zip(terms, columns, backgrounds):
            for i, row in enumerate(column):
                probability = (
                    sampled_frequency(row["frequency"], rng) if row else background
                )
                ratio = (
                    probability / background
                    if term["present"]
                    else (1 - probability) / (1 - background)
                )
                logs[i] += math.log(ratio)
        values = normalized(logs)
        for i in order:
            bands[i].append(values[i])
    ranking = []
    for i in order:
        values = sorted(bands[i])
        pct = round(percentages[i], 6)
        ranking.append(
            {
                "disease_id": dataset.ids[i],
                "name": dataset.names[dataset.ids[i]],
                "pct": pct,
                "low": round(min(pct, values[int(0.05 * (draws - 1))]), 6),
                "high": round(max(pct, values[int(0.95 * (draws - 1))]), 6),
                "drivers": sorted(drivers[i], key=lambda item: -abs(item["log_lr"]))[
                    :3
                ],
            }
        )
    return {
        "demo_data": True,
        "sources": sources,
        "ranking": ranking,
        "next_question": None,
        "total_diseases": len(dataset.ids),
        "other_pct": round(100 - sum(row["pct"] for row in ranking), 6),
        "terms_used": len(terms),
        "method": "HPO phenotype likelihood ratios; uniform disease prior; hierarchy-aware",
        "range_kind": "90% frequency-sensitivity envelope, 64 seeded draws; not a calibrated confidence interval",
        "disclaimer": DISCLAIMER,
    }


def entropy(p):
    p = clip(p)
    return -p * math.log2(p) - (1 - p) * math.log2(1 - p)


def next_question(dataset, terms, candidates, sources):
    asked = {term["hpo_id"] for term in terms}
    possible = sorted(
        {
            row["hpo_id"]
            for disease in candidates
            for row in dataset.annotations[disease]
        }
        - asked
    )
    best = None
    for term in possible:
        rows = dataset.column(term)
        background = dataset.background(rows)
        probabilities = [
            clip(dataset.match(disease, term)["frequency"]["mean"])
            if dataset.match(disease, term)
            else background
            for disease in candidates
        ]
        if len(probabilities) != 2:
            continue
        p, q = probabilities
        gain = max(0, entropy((p + q) / 2) - (entropy(p) + entropy(q)) / 2)
        if best is None or gain > best[0]:
            best = gain, term, p, q
    if best is None or best[0] < 1e-8:
        return {
            "demo_data": True,
            "sources": sources,
            "hpo_id": None,
            "label": None,
            "question": "No supported question separates these candidates.",
            "candidates": candidates,
            "information_gain_bits": 0,
            "if_yes": "",
            "if_no": "",
            "rationale": "Insufficient discriminating annotations.",
        }
    gain, term, p, q = best
    yes, no = (
        (candidates[0], candidates[1]) if p > q else (candidates[1], candidates[0])
    )
    return {
        "demo_data": True,
        "sources": sources,
        "hpo_id": term,
        "label": dataset.labels[term],
        "question": "Is there " + dataset.labels[term].lower() + "?",
        "candidates": candidates,
        "information_gain_bits": round(gain, 6),
        "if_yes": yes,
        "if_no": no,
        "rationale": "Maximum binary information gain with equal weights for the two candidates; missing is neutral.",
    }


def build_case(cache):
    packet_path = cache / "phenopacket.json"
    packet = json.loads(packet_path.read_text(encoding="utf-8"))
    quotes = {
        "HP:0003236": "elevated creatine kinase",
        "HP:0012496": "reduced maximal inspiratory pressure",
        "HP:0012497": "reduced maximal expiratory pressure",
        "HP:0001638": "no cardiomyopathy",
        "HP:0001640": "no cardiomegaly",
    }
    terms = [
        {
            "hpo_id": row["type"]["id"],
            "label": row["type"]["label"],
            "present": not row.get("excluded", False),
            "quote": quotes[row["type"]["id"]],
        }
        for row in packet["phenotypicFeatures"]
    ]
    return {
        "id": "pompe_published_case",
        "disease_id": POMPE,
        "pmid": "PMID:7668832",
        "source_url": PACKET_URL,
        "source_version": PACKET_RELEASE,
        "source_sha256": digest(packet_path),
        "transcript_en": "This published adult case has elevated creatine kinase, reduced maximal inspiratory pressure and reduced maximal expiratory pressure. There is no cardiomyopathy and no cardiomegaly. Which disease patterns match these findings?",
        "transcript_es": "Este caso adulto publicado tiene creatina quinasa elevada, presión inspiratoria máxima reducida y presión espiratoria máxima reducida. No hay cardiomiopatía ni cardiomegalia. ¿Qué patrones de enfermedad coinciden con estos hallazgos?",
        "terms": terms,
        "term_sequence": [term["hpo_id"] for term in terms],
        "demo_data": True,
        "adaptation_note": "Authored ES/EN narration of five published phenopacket findings, not a recording or quotation. No names, variants, family relationships or new clinical findings included. The known diagnosis is hidden from the narration.",
    }


def graph_sample(dataset, results, sources, cache):
    chosen = {POMPE, FKRP, "OMIM:253800"}
    for result in results:
        chosen.update(row["disease_id"] for row in result["ranking"])
    for disease in dataset.ids:
        if len(chosen) >= 300:
            break
        chosen.add(disease)
    layout = json.loads((cache / "overview.json").read_bytes())
    positions = {node["id"]: node for node in layout["diseases"]}
    missing = set(dataset.ids) - positions.keys()
    if missing:
        raise ValueError("Layout snapshot does not cover the HPO dataset")
    counts = defaultdict(int)
    for disease in dataset.ids:
        counts[positions[disease]["group"]] += 1
    groups = [{**group, "count": counts[group["id"]]} for group in layout["groups"]]
    nodes = []
    for disease in sorted(chosen):
        position = positions[disease]
        nodes.append(
            {
                "id": disease,
                "name": dataset.names[disease],
                "group": position["group"],
                "x": position["x"],
                "y": position["y"],
                "synonyms": [],
                "mechanism_ids": [],
            }
        )
    return {
        "demo_data": True,
        "sources": sources,
        "nodes": nodes,
        "groups": groups,
        "edges": [],
        "total_diseases": len(dataset.ids),
        "displayed_diseases": len(nodes),
        "layout_kind": "300 real disease positions sampled from HACK-003 HPO system galaxies",
    }


def curated_examples(dataset, graph, sources):
    # A deliberately small cited sample, not the full HACK-009 curated layer.
    other = "OMIM:253800"  # FKTN congenital dystroglycanopathy, not FKRP LGMD.
    if other not in dataset.names:
        raise ValueError("FKTN sample endpoint missing from HPO")
    mechanism_url = "https://www.nature.com/articles/ncomms11534"
    edge = {
        "id": "ribitol_fkrp_fktn",
        "src": FKRP,
        "dst": other,
        "type": "shared_mechanism",
        "source_url": mechanism_url,
        "record_id": "doi:10.1038/ncomms11534",
        "retrieved_at": RETRIEVED_AT,
        "confidence": 0.5,
        "evidence_level": "inferido",
        "summary": "FKRP and FKTN participate in ribitol-phosphate modification of alpha-dystroglycan.",
        "confidence_note": "Illustrative UI value, not calibrated. Disease bridge is inferred from a molecular pathway; it does not establish treatment transfer.",
    }
    disease = next(node for node in graph["nodes"] if node["id"] == FKRP)
    node = {
        "demo_data": True,
        "sources": sources,
        "disease": disease,
        "genes": [
            {
                "symbol": "FKRP",
                "disease_ids": [FKRP],
                "pathway": "alpha-dystroglycan glycosylation",
            }
        ],
        "mechanisms": [
            {
                "id": "ribitol_phosphate",
                "name": "Ribitol-phosphate modification",
                "gene_symbols": ["FKRP", "FKTN", "CRPPA"],
                "source_url": mechanism_url,
            }
        ],
        "summary": "Inspect the cited mechanism bridge. Shared biology alone does not establish shared therapy.",
        "symptoms_for": [
            {
                "hpo_id": "HP:0003236",
                "label": dataset.labels["HP:0003236"],
                "present": True,
            }
        ],
        "symptoms_against": [],
        "edges": [edge],
    }
    groups = [
        {
            "name": "CureLGMD2i",
            "diseases": [FKRP],
            "url": "https://curelgmd2i.com/",
            "registry": "https://clinicaltrials.gov/study/NCT04001595",
        }
    ]
    plan = {
        "demo_data": True,
        "sources": sources,
        "disease_id": FKRP,
        "supported": True,
        "groups": groups,
        "assets": [
            {
                "kind": "registro",
                "id": "NCT04001595",
                "name": "Global FKRP Registry",
                "url": "https://clinicaltrials.gov/study/NCT04001595",
                "evidence_level": "observado",
            }
        ],
        "bridges": [edge],
        "differences": [
            "A molecular bridge is not evidence of equal phenotype or treatment response."
        ],
        "needs_expert": [
            "Confirm diagnosis, registry eligibility and the applicability of any research evidence."
        ],
        "this_week": {
            "action": "Contact the Global FKRP Registry to ask about eligibility and available information.",
            "url": "https://clinicaltrials.gov/study/NCT04001595",
        },
        "timeline": {
            "current": {
                "label": "Rare-disease survey average to diagnosis",
                "duration": "4.7 years",
                "source_url": "https://www.nature.com/articles/s41431-024-01604-z",
            },
            "proposed": {
                "label": "Illustrative first contact",
                "duration": "This week",
                "source_url": None,
            },
            "assumptions": [
                "Contacting a registry is not diagnosis or treatment.",
                "No measured 10x improvement: lanes represent different outcomes.",
                "Eligibility, response times and clinical evaluation require confirmation.",
            ],
        },
        "searched": ["Cited FKRP registry and one molecular pathway bridge"],
        "missing_evidence": [],
    }
    unsupported = {
        **plan,
        "disease_id": POMPE,
        "supported": False,
        "groups": [],
        "assets": [],
        "bridges": [],
        "differences": [],
        "needs_expert": [
            "Ask a specialist to review evidence for the selected disease."
        ],
        "this_week": {
            "action": "Ask a specialist which disease-specific registry or resource is appropriate.",
            "url": None,
        },
        "timeline": None,
        "searched": ["This small FKRP-only action fixture"],
        "missing_evidence": [
            "No Pompe action route has been curated in this sample. This does not mean none exists."
        ],
    }
    return {
        "node.json": node,
        "edge.json": {"demo_data": True, "sources": sources, "edge": edge},
        "explain.json": {
            "demo_data": True,
            "sources": sources,
            "disease_id": FKRP,
            "text": "These disease groups share part of a pathway that modifies a muscle-associated protein [ribitol_fkrp_fktn]. This connection is a research clue, not evidence that a treatment will work in both groups.",
            "citations": [{"edge_id": edge["id"], "source_url": mechanism_url}],
            "generation_method": "Authored illustrative text; not an OpenAI response",
        },
        "action_plan.json": plan,
        "action_plan_unsupported.json": unsupported,
    }


def model_for(filename):
    return RESPONSE_MODELS[
        next(
            key
            for key in sorted(RESPONSE_MODELS, key=len, reverse=True)
            if filename.startswith(key)
        )
    ]


def generate(cache):
    for filename, expected in INPUT_HASHES.items():
        if digest(cache / filename) != expected:
            raise ValueError(
                "Input snapshot changed; review before regenerating: " + filename
            )
    dataset = Dataset(cache)
    case = build_case(cache)
    case = Case.model_validate(case).model_dump(mode="json")
    sources = [
        {
            "name": filename,
            "url": url,
            "version": (
                PACKET_RELEASE
                if filename == "phenopacket.json"
                else LAYOUT_COMMIT
                if filename == "overview.json"
                else HPO_RELEASE
            ),
            "sha256": digest(cache / filename),
        }
        for filename, url in INPUT_URLS.items()
    ]
    results = [
        score(dataset, case["terms"][:step], sources)
        for step in range(1, len(case["terms"]) + 1)
    ]
    question = next_question(dataset, case["terms"][:1], [POMPE, FKRP], sources)
    for step, result in enumerate(results, 1):
        candidates = [row["disease_id"] for row in result["ranking"][:2]]
        result["next_question"] = next_question(
            dataset, case["terms"][:step], candidates, sources
        )
    graph = graph_sample(dataset, results, sources, cache)
    responses = {
        "graph_overview.json": graph,
        "diagnose.json": results[-1],
        "next_question.json": question,
        "symptoms_extract.json": {
            "demo_data": True,
            "sources": sources,
            "terms": case["terms"],
            "extraction_method": "Published phenopacket mapped to authored narration; not an OpenAI recording",
        },
        "transcribe_session.json": {
            "demo_data": True,
            "sources": [],
            "client_secret": "SAMPLE_NOT_A_TOKEN",
            "expires_at": 0,
            "model": "sample-only",
            "usable": False,
        },
    }
    responses.update(
        {
            f"diagnose_step_{step:02d}.json": result
            for step, result in enumerate(results, 1)
        }
    )
    responses.update(curated_examples(dataset, graph, sources))
    dump(CASE_DIR / "pompe_case.json", case)
    for filename, response in responses.items():
        dump(
            OUT / filename,
            model_for(filename).model_validate(response).model_dump(mode="json"),
        )
    provenance = {
        "seed": SEED,
        "sources": sources,
        "hpoa_header": dataset.header,
        "disease_count": len(dataset.ids),
        "case_id": case["id"],
        "case_diagnosis_reused_in_hpoa": True,
        "limitations": [
            "The published demo case is also used by HPO annotations: demonstration, not independent validation.",
            "Correlated phenotypes are multiplied under a naive-independence assumption.",
            "Missing annotations use background frequency (LR 1); unknown frequency is not treated as absence.",
            "Disease IDs can represent overlapping diagnoses; OMIM and ORPHA records are not deduplicated.",
            "Compatible ancestor/descendant annotations use maximum frequency; no common-ancestor sibling match.",
            "Top ten normalize across all in-scope diseases; remaining mass is other_pct.",
            "Ranges are seeded frequency-sensitivity envelopes, not clinical confidence intervals.",
        ],
        "files": {
            str(path.relative_to(ROOT)).replace("\\", "/"): digest(path)
            for path in sorted(
                [CASE_DIR / "pompe_case.json"] + [OUT / name for name in responses]
            )
        },
    }
    dump(OUT / "provenance.json", provenance)
    print(
        f"GENERATED {len(responses)} responses; {len(dataset.ids)} diseases; "
        f"top match: {results[-1]['ranking'][0]['disease_id']}"
    )


def check():
    provenance = json.loads((OUT / "provenance.json").read_text(encoding="utf-8"))
    for relative, expected in provenance["files"].items():
        path = ROOT / relative
        if digest(path) != expected:
            raise ValueError("Generated fixture changed: " + relative)
        value = json.loads(path.read_text(encoding="utf-8"))
        (Case if path.parent == CASE_DIR else model_for(path.name)).model_validate(
            value
        )
    print(
        f"FIXTURES_PASS {len(provenance['files'])} validated files; no network or regeneration"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=ROOT / ".cache" / "hpo")
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        check()
    else:
        if args.download:
            download(args.cache)
        generate(args.cache)


if __name__ == "__main__":
    main()
