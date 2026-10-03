"""Offline acceptance for shared contracts and public-case fixture integrity."""

import copy
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path

import pytest
from pydantic import ValidationError

# HACK-002 can run before HACK-001 supplies pytest's pythonpath configuration.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app.fixtures.api.generate import Dataset, check, dump, frequency, model_for, score
from app.schemas import Case, DiagnosisRequest, DiagnosisResult, Edge

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
API = FIXTURES / "api"


def load(name):
    return json.loads((API / name).read_text(encoding="utf-8"))


def test_json_hashes_use_identical_bytes_on_windows_and_unix(tmp_path):
    path = tmp_path / "sample.json"
    dump(path, {"label": "CK elevada"})
    assert path.read_bytes() == b'{\n  "label": "CK elevada"\n}\n'


@pytest.mark.parametrize("path", sorted(API.glob("*.json")))
def test_every_response_validates(path):
    if path.name in {"provenance.json", "contracts.json"}:
        return
    response = model_for(path.name).model_validate_json(
        path.read_text(encoding="utf-8")
    )
    assert response.demo_data is True


def test_published_case_has_present_and_excluded_findings():
    case = Case.model_validate_json(
        (FIXTURES / "case/pompe_case.json").read_text(encoding="utf-8")
    )
    assert case.pmid == "PMID:7668832"
    assert case.disease_id == "OMIM:621314"
    assert [(term.hpo_id, term.present) for term in case.terms] == [
        ("HP:0003236", True),
        ("HP:0012496", True),
        ("HP:0012497", True),
        ("HP:0001638", False),
        ("HP:0001640", False),
    ]
    # A short narration fits the task's <= 60 s at a conservative 90 wpm.
    assert all(
        len(text.split()) <= 90 for text in [case.transcript_en, case.transcript_es]
    )
    assert [term.hpo_id for term in case.terms] == case.term_sequence


def test_provenance_and_generated_steps_are_complete():
    check()
    provenance = load("provenance.json")
    assert provenance["case_diagnosis_reused_in_hpoa"] is True
    assert provenance["disease_count"] >= 12000
    assert all(len(source["sha256"]) == 64 for source in provenance["sources"])
    case = json.loads((FIXTURES / "case/pompe_case.json").read_text(encoding="utf-8"))
    steps = sorted(API.glob("diagnose_step_*.json"))
    assert len(steps) == len(case["terms"])
    for index, path in enumerate(steps, 1):
        result = json.loads(path.read_text(encoding="utf-8"))
        assert result["terms_used"] == index
        assert result["total_diseases"] == provenance["disease_count"]
    assert load("diagnose.json") == json.loads(steps[-1].read_text(encoding="utf-8"))


def test_sample_graph_contains_all_ranked_and_demo_diseases():
    graph = load("graph_overview.json")
    ids = {node["id"] for node in graph["nodes"]}
    assert len(ids) == 300
    assert {"OMIM:621314", "ORPHA:34515"} <= ids
    for path in API.glob("diagnose*.json"):
        result = json.loads(path.read_text(encoding="utf-8"))
        assert {row["disease_id"] for row in result["ranking"]} <= ids


def test_citations_refer_to_inspectable_edges():
    node = load("node.json")
    edges = {edge["id"]: edge for edge in node["edges"]}
    assert load("edge.json")["edge"] in node["edges"]
    explanation = load("explain.json")
    for citation in explanation["citations"]:
        assert citation["edge_id"] in edges
        assert citation["source_url"] == edges[citation["edge_id"]]["source_url"]
        assert "[" + citation["edge_id"] + "]" in explanation["text"]
    assert load("action_plan.json")["bridges"] == node["edges"]
    assert "not an OpenAI" in explanation["generation_method"]


def test_unusable_transcription_sample_never_looks_like_a_real_token():
    session = load("transcribe_session.json")
    assert session["usable"] is False
    assert session["expires_at"] == 0
    assert session["client_secret"] == "SAMPLE_NOT_A_TOKEN"


def test_unknown_fields_bad_ids_and_evidence_levels_are_rejected():
    edge = load("edge.json")["edge"]
    for field, value in [
        ("src", "made-up-id"),
        ("evidence_level", "clinical-proof"),
        ("source_url", "not-a-url"),
        ("confidence", 1.1),
        ("secret", "value"),
    ]:
        invalid = {**edge, field: value}
        with pytest.raises(ValidationError):
            Edge.model_validate(invalid)


def test_inverted_percentage_band_and_mass_are_rejected():
    result = load("diagnose.json")
    invalid = copy.deepcopy(result)
    invalid["ranking"][0]["low"] = 100
    invalid["ranking"][0]["high"] = 0
    with pytest.raises(ValidationError):
        DiagnosisResult.model_validate(invalid)
    invalid = copy.deepcopy(result)
    invalid["other_pct"] = 100
    with pytest.raises(ValidationError):
        DiagnosisResult.model_validate(invalid)


def test_conflicting_observations_are_rejected():
    term = {"hpo_id": "HP:0003236", "label": "CK elevated", "present": True}
    with pytest.raises(ValidationError):
        DiagnosisRequest.model_validate({"terms": [term, {**term, "present": False}]})


def test_frequency_missing_zero_and_hpo_bands_are_distinct():
    assert frequency("")["mean"] is None
    assert frequency("0/1")["mean"] == 0
    assert frequency("80%")["mean"] == 0.8
    assert frequency("HP:0040281")["mean"] == pytest.approx(0.895)
    with pytest.raises(ValueError):
        frequency("3/2")


def tiny_dataset():
    dataset = Dataset.__new__(Dataset)
    dataset.ids = ["OMIM:1", "OMIM:2", "OMIM:3"]
    dataset.names = dict(zip(dataset.ids, ["Annotated", "Missing", "Excluded"]))
    dataset.parents = defaultdict(set)
    dataset._ancestors = {}
    dataset._columns = {}
    dataset.parents["HP:0000002"].add("HP:0000001")
    dataset.labels = {"HP:0000001": "Parent", "HP:0000002": "Child"}
    dataset.annotations = defaultdict(
        list,
        {
            "OMIM:1": [
                {
                    "hpo_id": "HP:0000002",
                    "frequency": frequency("80%"),
                    "reference": "fixture",
                }
            ],
            "OMIM:3": [
                {
                    "hpo_id": "HP:0000001",
                    "frequency": frequency("0/1"),
                    "reference": "fixture",
                }
            ],
        },
    )
    return dataset


def test_lr_missing_is_neutral_and_negation_uses_complement():
    dataset = tiny_dataset()
    term = {"hpo_id": "HP:0000001", "label": "Parent", "present": True}
    positive = score(dataset, [term], [], draws=8)
    by_id = {row["disease_id"]: row for row in positive["ranking"]}
    assert by_id["OMIM:2"]["drivers"][0]["likelihood_ratio"] == 1
    assert positive["ranking"][0]["disease_id"] == "OMIM:1"
    # Hand-check the likelihood ratio using the full three-disease background.
    assert by_id["OMIM:1"]["drivers"][0]["likelihood_ratio"] == pytest.approx(3)
    negative = score(dataset, [{**term, "present": False}], [], draws=8)
    assert negative["ranking"][0]["disease_id"] == "OMIM:3"
    by_id = {row["disease_id"]: row for row in negative["ranking"]}
    assert by_id["OMIM:1"]["drivers"][0]["likelihood_ratio"] == pytest.approx(
        0.2 / (1 - 0.8 / 3)
    )
    assert by_id["OMIM:2"]["drivers"][0]["likelihood_ratio"] == 1


def test_hierarchy_matches_descendants_but_not_siblings():
    dataset = tiny_dataset()
    assert dataset.match("OMIM:1", "HP:0000001")["hpo_id"] == "HP:0000002"
    dataset.parents["HP:0000003"].add("HP:0000001")
    assert dataset.match("OMIM:1", "HP:0000003") is None


def test_case_hash_is_bound_to_provenance():
    case = json.loads((FIXTURES / "case/pompe_case.json").read_text(encoding="utf-8"))
    source = next(
        source
        for source in load("provenance.json")["sources"]
        if source["name"] == "phenopacket.json"
    )
    assert case["source_sha256"] == source["sha256"]
    fixture_path = "app/fixtures/case/pompe_case.json"
    assert (
        hashlib.sha256((FIXTURES / "case/pompe_case.json").read_bytes()).hexdigest()
        == load("provenance.json")["files"][fixture_path]
    )
