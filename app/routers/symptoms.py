from fastapi import APIRouter

from app.schemas import SymptomsExtractRequest, SymptomsExtractResult, TranscribeSession
from app.services import symptoms

# Rutas fijadas por el contrato de HACK-002 (app/fixtures/api/README.md).
router = APIRouter(prefix="/api", tags=["symptoms"])


@router.post("/symptoms/extract", response_model=SymptomsExtractResult)
def extract(request: SymptomsExtractRequest) -> dict:
    return symptoms.extract(request.transcript, request.language)


@router.post("/transcribe/session", response_model=TranscribeSession)
def transcribe_session() -> dict:
    return symptoms.transcribe_session()
