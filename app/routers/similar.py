from fastapi import APIRouter, HTTPException, Query

from app.services import similar as service

router = APIRouter(prefix="/api", tags=["similar"])


@router.get("/similar/{disease_id}")
def similar(disease_id: str, k: int = Query(10, ge=1, le=10)) -> dict:
    try:
        return service.similar(disease_id, k)
    except service.UnknownDisease as error:
        raise HTTPException(404, str(error)) from error
