import json
import math
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import DiagnosisResult, NextQuestion
from app.services.scoring import Scorer

CASE = Path(__file__).resolve().parent.parent / "fixtures" / "case" / "pompe_case.json"
client = TestClient(app)


@pytest.fixture(scope="module")
def case_terms() -> list[dict]:
    return [
        {"hpo_id": t["hpo_id"], "label": t["label"], "present": t["present"]}
        for t in json.loads(CASE.read_text(encoding="utf-8"))["terms"]
    ]


def tiny_scorer() -> Scorer:
    # 5 enfermedades: HP:3 es hijo de HP:2; D4 sólo tiene frecuencia desconocida.
    annotations = {
        "diseases": {
            "D:1": {"HP:0000003": 0.9},
            "D:2": {"HP:0000002": 0.5},
            "D:3": {"HP:0000009": 0.9},
            "D:4": {"HP:0000003": None},
            "D:5": {},
        },
        "ancestors": {"HP:0000002": [], "HP:0000003": ["HP:0000002"], "HP:0000009": []},
        "labels": {"HP:0000002": "Parent", "HP:0000003": "Child", "HP:0000009": "Other"},
    }
    overview = {"sources": [], "nodes": [{"id": f"D:{i}", "name": f"D{i}"} for i in range(1, 6)]}
    return Scorer(annotations, overview)


def test_lr_uses_hierarchy_background_and_negation() -> None:
    scorer = tiny_scorer()
    column = scorer.column("HP:0000003")
    background = scorer.background(column)
    assert column["D:1"] == (0.9, "HP:0000003")
    assert column["D:2"] == (0.5, "HP:0000002")  # anotado en el ancestro
    assert "D:4" not in column and "D:5" not in column  # desconocido / no anotado → neutral
    assert math.isclose(background, (0.9 + 0.5) / 5)
    assert math.isclose(scorer.ratio(0.9, background, False), 0.1 / (1 - background))


def test_unannotated_disease_is_neutral() -> None:
    result = tiny_scorer().diagnose([{"hpo_id": "HP:0000003", "label": "Child", "present": True}])
    rows = {r["disease_id"]: r for r in result["ranking"]}
    assert rows["D:5"]["drivers"][0]["direction"] == "neutral"
    assert rows["D:4"]["pct"] == rows["D:5"]["pct"]
    assert result["ranking"][0]["disease_id"] == "D:1"


def test_case_puts_late_onset_pompe_in_top_two(case_terms) -> None:
    body = client.post("/api/diagnose", json={"terms": case_terms}).json()
    result = DiagnosisResult.model_validate(body)
    top_two = [r.disease_id for r in result.ranking[:2]]
    assert "OMIM:621314" in top_two
    pompe = next(r for r in result.ranking if r.disease_id == "OMIM:621314")
    respiratory = {"HP:0012496", "HP:0012497"}
    assert respiratory & {d.hpo_id for d in pompe.drivers if d.direction == "supports"}
    assert all(r.low <= r.pct <= r.high for r in result.ranking)


def test_next_question_separates_top_two(case_terms) -> None:
    body = client.post("/api/next-question", json={"terms": case_terms}).json()
    question = NextQuestion.model_validate(body)
    asked = {t["hpo_id"] for t in case_terms}
    assert len(question.candidates) == 2 and question.hpo_id not in asked
    assert question.information_gain_bits > 0
    assert {question.if_yes, question.if_no} == set(question.candidates)


def test_contradictory_terms_are_rejected() -> None:
    term = {"hpo_id": "HP:0003236", "label": "CK", "present": True}
    assert client.post("/api/diagnose", json={"terms": [term, {**term, "present": False}]}).status_code == 422
