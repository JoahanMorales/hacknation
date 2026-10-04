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
    assert body["nodes"][0]["id"] == "OMIM:310200"
    # HACK-030: ya no queda sólo el centro; sus vecinos fenotípicos aparecen como similitud inferida.
    assert body["edges"] and {e["type"] for e in body["edges"]} == {"phenotype_similarity"}
    assert all(e["evidence_level"] == "inferido" for e in body["edges"])
    assert any("does not mean none exists" in m for m in body["coverage"]["missing"])
    assert body["coverage"]["searched"]


def test_unknown_disease_is_404() -> None:
    assert client.get("/api/pathway/OMIM:1").status_code == 404


def test_phenotype_neighbors_join_the_pathway() -> None:
    body = client.get("/api/pathway/ORPHA:34515").json()
    similarity = [e for e in body["edges"] if e["type"] == "phenotype_similarity"]
    assert 1 <= len(similarity) <= 6
    assert all(e["evidence_level"] == "inferido" and e["source_url"] for e in similarity)
    assert all("do not prove a shared cause" in e["summary"] for e in similarity)
    nodes = {n["id"]: n for n in body["nodes"]}
    assert all(nodes[e["dst"]]["meta"]["similarity"] > 0 for e in similarity)
    # El top-1 fenotípico de LGMD R9 es una distroglicanopatía curada que además comparte mecanismo.
    assert any(nodes[e["dst"]]["meta"]["curated"] for e in similarity)
