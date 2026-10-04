from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from app.services import pathway

# Modelos locales (ola 3): no se edita app/schemas/.
router = APIRouter(prefix="/api", tags=["pathway"])
EvidenceLevel = Literal["observado", "inferido", "hipotesis", "contradictorio"]


class Node(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    type: Literal["disease", "gene", "mechanism", "group", "asset", "investigator"]
    label: str
    meta: dict


class Edge(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    src: str
    dst: str
    type: str
    evidence_level: EvidenceLevel
    source_url: str | None
    summary: str
    curated_edge_id: str | None


class Coverage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    searched: list[str]
    missing: list[str]


class Pathway(BaseModel):
    model_config = ConfigDict(extra="forbid")
    center: str
    nodes: list[Node]
    edges: list[Edge]
    coverage: Coverage


@router.get("/pathway/{disease_id}", response_model=Pathway)
def get_pathway(disease_id: str) -> dict:
    try:
        return pathway.build(disease_id)
    except LookupError as error:
        raise HTTPException(404, str(error)) from error
