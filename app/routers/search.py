from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict

from app.services.search import get_index

# Modelos locales (ola 3): no se edita app/schemas/.
router = APIRouter(prefix="/api", tags=["search"])


class SearchResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    id: str
    label: str
    matched: str
    disease_ids: list[str]
    score: float


class SearchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str
    results: list[SearchResult]


@router.get("/search", response_model=SearchResponse)
def search(q: str = Query("", max_length=200), limit: int = Query(20, ge=1, le=50)) -> dict:
    return {"query": q, "results": get_index().search(q, limit)}
