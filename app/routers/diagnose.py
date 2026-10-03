from fastapi import APIRouter

from app.schemas import DiagnosisRequest, DiagnosisResult, NextQuestion
from app.services.scoring import get_scorer

# Rutas fijadas por el contrato de HACK-002 (app/fixtures/api/README.md).
router = APIRouter(prefix="/api", tags=["diagnose"])


def _terms(request: DiagnosisRequest) -> list[dict]:
    return [term.model_dump() for term in request.terms]


@router.post("/diagnose", response_model=DiagnosisResult)
def diagnose(request: DiagnosisRequest) -> dict:
    return get_scorer().diagnose(_terms(request))


@router.post("/next-question", response_model=NextQuestion)
def next_question(request: DiagnosisRequest) -> dict:
    scorer = get_scorer()
    terms = _terms(request)
    top_two = [row["disease_id"] for row in scorer.diagnose(terms)["ranking"][:2]]
    return scorer.next_question(terms, top_two)
