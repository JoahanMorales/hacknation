import json
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import ActionPlan

client = TestClient(app)
FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "api"
LGMD_R9 = "ORPHA:34515"
POMPE = "OMIM:621314"
# El paso de la semana siempre empieza por contactar, preguntar o probar; nunca por tratar.
SAFE_STEP = re.compile(r"^(Contact|Ask|Test)\b")
TREATMENT = re.compile(r"\b(take|start|begin|dose|prescri\w*|treat(ment)?)\b", re.IGNORECASE)


def plan(disease_id: str) -> dict:
    response = client.post("/api/action-plan", json={"disease_id": disease_id})
    assert response.status_code == 200
    return ActionPlan.model_validate(response.json()).model_dump(mode="json")


def test_lgmd_r9_plan_for_maria() -> None:
    body = plan(LGMD_R9)
    assert body["supported"]
    assert "CureLGMD2i" in {g["name"] for g in body["groups"]}
    assert "NCT04001595" in {a["id"] for a in body["assets"]}
    assert body["this_week"]["url"] == "https://clinicaltrials.gov/study/NCT04001595"
    assert all(b["src"] == LGMD_R9 for b in body["bridges"])
    assert {"E01", "E04", "E06"} <= {b["id"] for b in body["bridges"]}
    assert "E07" not in {b["id"] for b in body["bridges"]}, "el diferencial no es un puente"
    assert any("E05" in d and "hipotesis" in d for d in body["differences"])


def test_shape_matches_contract_fixture() -> None:
    sample = json.loads((FIXTURES / "action_plan.json").read_text(encoding="utf-8"))
    assert set(plan(LGMD_R9)) == set(sample)


def test_timeline_cites_eurordis_and_lists_assumptions() -> None:
    timeline = plan(LGMD_R9)["timeline"]
    assert timeline["current"]["duration"] == "4.7 years"
    assert "s41431-024-01604-z" in timeline["current"]["source_url"]
    assert "EURORDIS" in timeline["current"]["label"]
    assert len(timeline["assumptions"]) >= 3


def test_pompe_proposes_dbs_test() -> None:
    body = plan(POMPE)
    assert body["supported"]
    assert body["this_week"]["url"] == "https://clinicaltrials.gov/study/NCT00231400"
    assert "blood spot" in body["timeline"]["proposed"]["label"]
    assert body["timeline"]["proposed"]["source_url"]


@pytest.mark.parametrize("disease_id", [LGMD_R9, POMPE, "OMIM:613153", "OMIM:616052", "OMIM:999999"])
def test_never_recommends_treatment(disease_id: str) -> None:
    body = plan(disease_id)
    action = body["this_week"]["action"]
    assert SAFE_STEP.match(action), action
    assert not TREATMENT.search(action), action


def test_unknown_disease_explains_what_was_searched() -> None:
    body = plan("OMIM:999999")
    assert not body["supported"]
    assert body["timeline"] is None
    assert body["searched"] and body["missing_evidence"]
    assert "does not mean none exists" in body["missing_evidence"][0]


def test_invalid_id_is_rejected() -> None:
    assert client.post("/api/action-plan", json={"disease_id": "FKRP"}).status_code == 422
