from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_fkrp_pathway_has_every_node_type_and_cited_edges() -> None:
    body = client.get("/api/pathway/ORPHA:34515").json()
    types = {n["type"] for n in body["nodes"]}
    assert {"disease", "gene", "mechanism", "group", "asset"} <= types
    ids = {n["id"] for n in body["nodes"]}
    assert {"gene:FKRP", "gene:FKTN", "gene:CRPPA", "mech:glycosylation.ribitol", "group:CureLGMD2i"} <= ids
    assert all(e["src"] in ids and e["dst"] in ids for e in body["edges"])
    assert all(e["source_url"] for e in body["edges"]), "toda arista con fuente"
    curated = {e["curated_edge_id"]: e for e in body["edges"] if e["curated_edge_id"]}
    assert curated["E05"]["evidence_level"] == "hipotesis"
    assert curated["E06"]["type"] == "allelic_series"  # contraejemplo visible


def test_pompe_pathway_reaches_its_community_and_registry() -> None:
    body = client.get("/api/pathway/OMIM:621314").json()
    ids = {n["id"] for n in body["nodes"]}
    assert {"gene:GAA", "group:International Pompe Association", "asset:NCT00231400"} <= ids


def test_outside_cluster_is_an_honest_gap_not_a_404() -> None:
    body = client.get("/api/pathway/OMIM:310200").json()
    assert [n["id"] for n in body["nodes"]] == ["OMIM:310200"] and body["edges"] == []
    assert any("does not mean none exists" in m for m in body["coverage"]["missing"])
    assert body["coverage"]["searched"]


def test_unknown_disease_is_404() -> None:
    assert client.get("/api/pathway/OMIM:1").status_code == 404
