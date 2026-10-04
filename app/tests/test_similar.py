from fastapi.testclient import TestClient

from app.main import app
from app.services import similar as service

client = TestClient(app)
LGMD_R9 = "ORPHA:34515"


def get(disease_id: str, **params) -> dict:
    response = client.get(f"/api/similar/{disease_id}", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_lgmd_r9_neighbors_are_dystroglycanopathies() -> None:
    body = get(LGMD_R9)
    assert body["name"] and len(body["neighbors"]) == 10
    scores = [n["score"] for n in body["neighbors"]]
    assert scores == sorted(scores, reverse=True) and all(0 < s <= 1 for s in scores)
    # MDDG y "alpha-dystroglycan-related": ≥ 5 de 10 frente a 0.03 esperadas por azar (docs/similarity.md).
    dystroglycanopathies = [n for n in body["neighbors"] if "dystroglycan" in n["name"].lower()]
    assert len(dystroglycanopathies) >= 5


def test_shared_phenotypes_explain_each_neighbor() -> None:
    for neighbor in get(LGMD_R9)["neighbors"]:
        shared = neighbor["shared"]
        assert shared, neighbor["disease_id"]
        assert [s["ic"] for s in shared] == sorted((s["ic"] for s in shared), reverse=True)
        assert all(s["hpo_id"].startswith("HP:") and s["label"] for s in shared)


def test_curated_overlap_only_inside_deep_layer() -> None:
    mechanisms, _ = service.curated()
    for neighbor in get(LGMD_R9)["neighbors"]:
        if neighbor["disease_id"] in mechanisms:
            assert set(neighbor["curated"]) == {"genes", "mechanisms", "same_family"}
        else:
            assert neighbor["curated"] is None


def test_curated_overlap_flags_shared_mechanism_and_contrast() -> None:
    assert service.curated_overlap(LGMD_R9, "OMIM:611588")["mechanisms"] == ["glycosylation.ribitol"]
    pompe = service.curated_overlap(LGMD_R9, "OMIM:621314")
    assert pompe == {"genes": [], "mechanisms": [], "same_family": []}


def test_k_limits_results() -> None:
    assert len(get(LGMD_R9, k=3)["neighbors"]) == 3
    assert client.get(f"/api/similar/{LGMD_R9}", params={"k": 11}).status_code == 422


def test_unknown_disease_is_404() -> None:
    response = client.get("/api/similar/OMIM:999999")
    assert response.status_code == 404
    assert "not in the phenotype atlas" in response.json()["detail"]
