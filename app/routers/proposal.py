from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from app.services import proposal

# Modelos locales (ola 3): no se edita app/schemas/.
router = APIRouter(prefix="/api", tags=["proposal"])


class ProposalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    disease_id: str
    partner_disease_id: str | None = None


class Source(BaseModel):
    model_config = ConfigDict(extra="allow")
    key: str
    kind: Literal["edge", "group", "asset"]
    label: str
    url: str


class Proposal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["1.0"]
    demo_data: bool
    disease_id: str
    partner_disease_id: str
    title: str
    markdown: str
    cited_keys: list[str]
    sources: list[Source]
    questions_for_expert: list[str]
    generation_method: str


@router.post("/proposal", response_model=Proposal)
def draft(request: ProposalRequest) -> dict:
    try:
        return proposal.propose(request.disease_id, request.partner_disease_id)
    except proposal.NotSupported as error:
        raise HTTPException(404, str(error)) from error
