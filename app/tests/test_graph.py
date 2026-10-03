import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import graph

client = TestClient(app)


def test_overview_serves_layout() -> None:
    body = client.get("/api/graph/overview").json()
    ids = {d["id"] for d in body["nodes"]}
    groups = {g["id"] for g in body["groups"]}
    assert len(ids) == body["total_diseases"] >= 12000
    assert {"OMIM:621314", "ORPHA:34515"} <= ids
    assert all(d["group"] in groups for d in body["nodes"])


def test_overview_matches_contract() -> None:
    schemas = pytest.importorskip("app.schemas", reason="contrato de HACK-002 aún no integrado")
    schemas.GraphOverview.model_validate(client.get("/api/graph/overview").json())


def test_overview_missing_returns_503(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(graph, "OVERVIEW", tmp_path / "missing.json")
    assert client.get("/api/graph/overview").status_code == 503
