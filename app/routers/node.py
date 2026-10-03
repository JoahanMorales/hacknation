from fastapi import APIRouter, HTTPException

from app.schemas import EdgeResult, ExplainRequest, ExplainResult, NodeResult
from app.services import explain as service

# Rutas fijadas por el contrato de HACK-002 (app/fixtures/api/README.md).
router = APIRouter(prefix="/api", tags=["node"])


@router.get("/node/{disease_id}", response_model=NodeResult)
def node(disease_id: str) -> dict:
    try:
        return service.node(disease_id)
    except service.NotInDeepLayer as error:
        raise HTTPException(404, str(error)) from error


@router.get("/edge/{edge_id}", response_model=EdgeResult)
def edge(edge_id: str) -> dict:
    try:
        return service.edge(edge_id)
    except service.NotInDeepLayer as error:
        raise HTTPException(404, str(error)) from error


@router.post("/explain", response_model=ExplainResult)
def explain(request: ExplainRequest) -> dict:
    try:
        return service.explain(request.disease_id, request.edge_ids, request.language)
    except service.NotInDeepLayer as error:
        raise HTTPException(404, str(error)) from error
