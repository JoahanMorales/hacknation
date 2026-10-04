from fastapi import APIRouter, HTTPException

from app.services import connector as service

router = APIRouter(prefix="/api", tags=["connector"])


@router.get("/connector/{disease_id}")
def connector(disease_id: str) -> dict:
    try:
        return service.connector(disease_id)
    except service.NotInCluster as error:
        raise HTTPException(404, str(error)) from error
