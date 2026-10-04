import json
import urllib.request

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import connector as service

client = TestClient(app)
LGMD_R9 = "ORPHA:34515"
FKTN_DISEASE = "OMIM:611588"


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    """El endpoint sólo lee el snapshot: cualquier intento de red falla el test."""
    def refuse(*args, **kwargs):
        raise AssertionError("connector API must not use the network")
    monkeypatch.setattr(urllib.request, "urlopen", refuse)


def get(disease_id: str) -> dict:
    response = client.get(f"/api/connector/{disease_id}")
    assert response.status_code == 200, response.text
    return response.json()


def test_lgmd_r9_projects_with_investigators_and_urls() -> None:
    body = get(LGMD_R9)
    assert body["genes"] == ["FKRP"]
    assert body["projects"] and body["organizations"]
    for project in body["projects"]:
        assert project["url"].startswith("https://reporter.nih.gov/project-details/")
        assert all(set(pi) == {"profile_id", "name"} for pi in project["investigators"])


def test_shared_investigators_link_unrelated_communities() -> None:
    shared = get(LGMD_R9)["shared_investigators"]
    assert shared, "FKRP y FKTN comparten investigadores financiados en el snapshot"
    assert any(FKTN_DISEASE in s["other_disease_ids"] for s in shared)
    for s in shared:
        assert s["other_genes"] and "FKRP" not in s["other_genes"]
        assert LGMD_R9 not in s["other_disease_ids"] and "OMIM:613153" not in s["other_disease_ids"]


def test_extracted_edges_are_about_the_gene() -> None:
    body = get(LGMD_R9)
    assert body["extracted_edges"] and body["context_edges_omitted"] > 0
    for edge in body["extracted_edges"]:
        text = f"{edge['subject']} {edge['object']}".lower()
        assert "fkrp" in text or "fukutin-related" in text or "fukutin related" in text or "dystroglycan" in text
    keys = [(e["pmid"], e["subject"].lower(), e["relation"], e["object"].lower()) for e in body["extracted_edges"]]
    assert len(keys) == len(set(keys)), "sin aristas duplicadas"


def test_articles_have_pmid_links() -> None:
    articles = get(LGMD_R9)["articles"]
    assert articles and all(a["url"] == f"https://pubmed.ncbi.nlm.nih.gov/{a['pmid']}/" for a in articles)


def test_extracted_edges_are_inferred_unreviewed_and_quoted() -> None:
    for gene_disease in (LGMD_R9, FKTN_DISEASE, "OMIM:621314"):
        for edge in get(gene_disease)["extracted_edges"]:
            assert edge["evidence_level"] == "inferido"
            assert edge["note"] == "AI-extracted, unreviewed"
            assert edge["pmid"] and edge["quote"]


def test_snapshot_publishes_no_abstracts_or_contact_data() -> None:
    text = json.dumps(service.snapshot())
    assert '"abstract"' not in text
    assert "@" not in text, "sin correos u otros datos de contacto"


def test_outside_cluster_is_404() -> None:
    response = client.get("/api/connector/OMIM:253600")
    assert response.status_code == 404
    assert "not in the connector cluster" in response.json()["detail"]
