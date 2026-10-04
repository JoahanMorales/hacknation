import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.schemas import SymptomsExtractResult, TranscribeSession
from app.services import symptoms

CASE = json.loads((Path(__file__).resolve().parent.parent / "fixtures" / "case" / "pompe_case.json").read_text())
EXPECTED = {(t["hpo_id"], t["present"]) for t in CASE["terms"]}
client = TestClient(app)


@pytest.fixture
def live(monkeypatch):
    monkeypatch.setattr(settings, "demo_mode", False)
    monkeypatch.setattr(settings, "openai_api_key", "sk-test-not-real")


def test_local_search_finds_case_terms_among_candidates() -> None:
    found = {c["hpo_id"] for c in symptoms.candidates(CASE["transcript_en"])}
    assert {hpo_id for hpo_id, _ in EXPECTED} <= found


@pytest.mark.parametrize("language", ["en", "es"])
def test_demo_mode_returns_recorded_case(monkeypatch, language) -> None:
    monkeypatch.setattr(settings, "demo_mode", True)
    body = client.post("/api/symptoms/extract", json={"transcript": CASE[f"transcript_{language}"],
                                                      "language": language}).json()
    result = SymptomsExtractResult.model_validate(body)
    assert result.demo_data and {(t.hpo_id, t.present) for t in result.terms} == EXPECTED


def test_unknown_and_repeated_ids_are_dropped(monkeypatch, live) -> None:
    monkeypatch.setattr(symptoms, "_choose", lambda transcript, cands: [
        {"hpo_id": "HP:0003236", "present": True, "quote": "elevated creatine kinase"},
        {"hpo_id": "HP:0003236", "present": False, "quote": "repeat"},
        {"hpo_id": "HP:9999999", "present": True, "quote": "invented"},
    ])
    body = client.post("/api/symptoms/extract", json={"transcript": CASE["transcript_en"]}).json()
    assert [(t["hpo_id"], t["present"]) for t in body["terms"]] == [("HP:0003236", True)]
    assert body["demo_data"] is False


def test_network_error_falls_back_to_recorded(monkeypatch, live) -> None:
    def fail(*_):
        raise ConnectionError("offline")

    monkeypatch.setattr(symptoms, "_choose", fail)
    body = client.post("/api/symptoms/extract", json={"transcript": CASE["transcript_en"]}).json()
    assert body["demo_data"] is True and "ConnectionError" in body["extraction_method"]


def test_transcribe_session_never_exposes_the_api_key(monkeypatch, live) -> None:
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"value": "ek_ephemeral", "expires_at": 1791070000}

    monkeypatch.setattr(symptoms.httpx, "post", lambda *a, **k: Response())
    body = client.post("/api/transcribe/session").json()
    session = TranscribeSession.model_validate(body)
    assert session.client_secret == "ek_ephemeral" and session.usable
    assert "sk-test-not-real" not in json.dumps(body)


def test_transcribe_session_in_demo_mode_is_unusable(monkeypatch) -> None:
    monkeypatch.setattr(settings, "demo_mode", True)
    assert client.post("/api/transcribe/session").json()["usable"] is False


def test_spanish_marked_as_english_is_detected() -> None:
    assert symptoms.looks_spanish(CASE["transcript_es"])
    assert not symptoms.looks_spanish(CASE["transcript_en"])


def test_spanish_text_sent_as_english_uses_translation(monkeypatch, live) -> None:
    seen = {}
    monkeypatch.setattr(symptoms, "_translate", lambda text: seen.setdefault("translated", True) and CASE["transcript_en"])
    monkeypatch.setattr(symptoms, "_choose", lambda transcript, cands: [])
    client.post("/api/symptoms/extract", json={"transcript": CASE["transcript_es"], "language": "en"})
    assert seen.get("translated")
