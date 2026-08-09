import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.automation import (
    AutomationRuleCreate,
    AutomationRuleRead,
    AutomationRuleUpdate,
    AutomationRunRead,
)
from app.services.automation_service import AutomationService

router = APIRouter(tags=["automation"])


@router.post(
    "/projects/{project_id}/automation-rules",
    response_model=AutomationRuleRead,
    status_code=status.HTTP_201_CREATED,
)
def create_automation_rule(
    project_id: uuid.UUID,
    payload: AutomationRuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AutomationService(db).create_rule(project_id, payload, current_user)


@router.get("/projects/{project_id}/automation-rules", response_model=list[AutomationRuleRead])
def list_automation_rules(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AutomationService(db).list_rules(project_id, current_user)


@router.put("/automation-rules/{rule_id}", response_model=AutomationRuleRead)
def update_automation_rule(
    rule_id: uuid.UUID,
    payload: AutomationRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AutomationService(db).update_rule(rule_id, payload, current_user)


@router.delete("/automation-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_automation_rule(
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    AutomationService(db).delete_rule(rule_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/automation-rules/{rule_id}/runs", response_model=list[AutomationRunRead])
def list_automation_runs(
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AutomationService(db).list_runs(rule_id, current_user)
