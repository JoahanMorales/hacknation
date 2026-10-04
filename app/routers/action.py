from fastapi import APIRouter

from app.schemas import ActionPlan, ActionPlanRequest
from app.services.action import build_plan

# Ruta fijada por el contrato de HACK-002 (app/fixtures/api/README.md).
router = APIRouter(prefix="/api", tags=["action"])


@router.post("/action-plan", response_model=ActionPlan)
def action_plan(request: ActionPlanRequest) -> dict:
    return build_plan(request.disease_id)
