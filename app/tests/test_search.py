import time

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def top(q: str) -> dict:
    return client.get("/api/search", params={"q": q}).json()["results"][0]


@pytest.mark.parametrize(
    ("query", "type_", "id_"),
    [
        ("LGMD2I", "disease", "ORPHA:34515"),
        ("FKRP", "gene", "FKRP"),
        ("ribitol", "mechanism", "glycosylation.ribitol"),
        ("Pompe", "disease", "OMIM:621314"),
        ("CureLGMD2i", "group", "CureLGMD2i"),
        ("elevated CK", "symptom", "HP:0003236"),
        ("creatina quinasa", "symptom", "HP:0003236"),
        ("NCT04001595", "asset", "NCT04001595"),
        ("OMIM:621314", "disease", "OMIM:621314"),
    ],
)
def test_expected_result_on_top(query, type_, id_) -> None:
    result = top(query)
    assert (result["type"], result["id"]) == (type_, id_)


def test_matched_synonym_is_reported() -> None:
    result = top("LGMD2I")
    assert result["matched"] == "LGMD2I" and result["label"].startswith("FKRP-related")


def test_gene_and_group_point_to_their_diseases() -> None:
    assert "ORPHA:34515" in top("FKRP")["disease_ids"]
    assert top("CureLGMD2i")["disease_ids"] == ["ORPHA:34515"]


def test_mixed_types_and_empty_query() -> None:
    types = {r["type"] for r in client.get("/api/search", params={"q": "FKRP"}).json()["results"]}
    assert {"gene", "mechanism", "disease"} <= types
    assert client.get("/api/search", params={"q": "  "}).json()["results"] == []


def test_warm_latency_under_150ms() -> None:
    client.get("/api/search", params={"q": "warmup"})
    started = time.perf_counter()
    for q in ("LGMD2I", "limb girdle", "creatina quinasa"):
        client.get("/api/search", params={"q": q})
    assert (time.perf_counter() - started) / 3 < 0.15
