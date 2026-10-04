import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.services import proposal

client = TestClient(app)


@pytest.fixture
def live(monkeypatch):
    monkeypatch.setattr(settings, "demo_mode", False)
    monkeypatch.setattr(settings, "openai_api_key", "sk-test-not-real")


def test_demo_mode_returns_recorded_proposal_with_valid_citations(monkeypatch) -> None:
    monkeypatch.setattr(settings, "demo_mode", True)
    body = client.post("/api/proposal", json={"disease_id": "ORPHA:34515"}).json()
    keys = {s["key"] for s in body["sources"]}
    assert body["partner_disease_id"] == "OMIM:616052" and body["demo_data"] is True
    assert "recorded" in body["generation_method"] and set(body["cited_keys"]) <= keys
    assert body["questions_for_expert"] and any("inferred" in q for q in body["questions_for_expert"])


def test_unknown_citations_are_removed(monkeypatch, live) -> None:
    monkeypatch.setattr(proposal, "_generate", lambda ctx: "Shared pathway [E02]. Invented [E99] and [X1].")
    body = client.post("/api/proposal", json={"disease_id": "ORPHA:34515"}).json()
    assert "[E99]" not in body["markdown"] and "[X1]" not in body["markdown"]
    assert body["cited_keys"][0] == "E02" and body["demo_data"] is False
    # Las fuentes citadas en las preguntas para el experto no se pierden (revisión de zoe-1).
    question_keys = {k for q in body["questions_for_expert"] for k in ("E04", "E06", "A1") if f"[{k}]" in q}
    assert question_keys and question_keys <= set(body["cited_keys"])


def test_model_without_citations_falls_back_to_sources(monkeypatch, live) -> None:
    monkeypatch.setattr(proposal, "_generate", lambda ctx: "A lovely proposal with no sources.")
    body = client.post("/api/proposal", json={"disease_id": "ORPHA:34515"}).json()
    assert body["demo_data"] is True and body["cited_keys"]


def test_template_for_pair_without_recording(monkeypatch) -> None:
    monkeypatch.setattr(settings, "demo_mode", True)
    body = client.post("/api/proposal", json={"disease_id": "ORPHA:34515", "partner_disease_id": "OMIM:611588"}).json()
    assert "without a language model" in body["generation_method"] and "[E05]" in body["markdown"]


def test_never_recommends_treatment_and_rejects_outside_cluster() -> None:
    assert client.post("/api/proposal", json={"disease_id": "OMIM:310200"}).status_code == 404
    assert client.post("/api/proposal", json={"disease_id": "ORPHA:34515", "partner_disease_id": "ORPHA:34515"}
                       ).status_code == 404
    text = proposal.template(proposal.context("ORPHA:34515", "OMIM:616052")).lower()
    assert "we recommend" not in text and "should take" not in text
