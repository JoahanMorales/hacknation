import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.schemas import EdgeResult, ExplainResult, NodeResult
from app.services import explain as service

client = TestClient(app)
BRIDGE = ["E04", "E05", "E06"]


@pytest.fixture
def live(monkeypatch):
    monkeypatch.setattr(settings, "demo_mode", False)
    monkeypatch.setattr(settings, "openai_api_key", "sk-test-not-real")


def test_node_from_deep_layer() -> None:
    result = NodeResult.model_validate(client.get("/api/node/ORPHA:34515").json())
    assert [g.symbol for g in result.genes] == ["FKRP"]
    assert {"E01", "E04", "E06"} <= {e.id for e in result.edges}
    assert result.symptoms_for and all(t.present for t in result.symptoms_for)


def test_edge_and_clear_404_outside_cluster() -> None:
    assert EdgeResult.model_validate(client.get("/api/edge/E05").json()).edge.evidence_level == "hipotesis"
    missing = client.get("/api/node/OMIM:310200")
    assert missing.status_code == 404 and "deep layer" in missing.json()["detail"]
    assert client.get("/api/edge/E99").status_code == 404


def test_unknown_citations_are_removed(monkeypatch, live) -> None:
    monkeypatch.setattr(service, "_generate", lambda *a: "Shared pathway [E04]. Invented link [E99]. Allelic [E06].")
    body = client.post("/api/explain", json={"disease_id": "ORPHA:34515", "edge_ids": BRIDGE}).json()
    result = ExplainResult.model_validate(body)
    assert "[E99]" not in result.text and [c.edge_id for c in result.citations] == ["E04", "E06"]
    assert result.demo_data is False


def test_text_without_valid_citations_uses_curated_summaries(monkeypatch, live) -> None:
    monkeypatch.setattr(service, "_generate", lambda *a: "No citations here [FAKE].")
    body = client.post("/api/explain", json={"disease_id": "ORPHA:34515", "edge_ids": BRIDGE}).json()
    assert body["demo_data"] is True and {c["edge_id"] for c in body["citations"]} == set(BRIDGE)


@pytest.mark.parametrize("language", ["en", "es"])
def test_demo_mode_uses_recorded_response(monkeypatch, language) -> None:
    monkeypatch.setattr(settings, "demo_mode", True)
    body = client.post("/api/explain", json={"disease_id": "ORPHA:34515", "edge_ids": BRIDGE,
                                             "language": language}).json()
    result = ExplainResult.model_validate(body)
    assert result.demo_data and "recorded" in result.generation_method
    assert {c.edge_id for c in result.citations} <= set(BRIDGE) and result.citations


def test_explain_rejects_unknown_edges() -> None:
    assert client.post("/api/explain", json={"disease_id": "ORPHA:34515", "edge_ids": ["E99"]}).status_code == 404
