import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.plan import PlanCreate, PlanRead, PlanUpdate, RoadmapRead
from app.schemas.work_item import WorkItemSummary
from app.services.plan_service import PlanService

router = APIRouter(tags=["plans"])


@router.post("/workspaces/{workspace_id}/plans", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
def create_plan(
    workspace_id: uuid.UUID,
    payload: PlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanService(db).create_plan(workspace_id, payload, current_user)


@router.get("/workspaces/{workspace_id}/plans", response_model=list[PlanRead])
def list_plans(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanService(db).list_plans(workspace_id, current_user)


@router.get("/plans/{plan_id}", response_model=PlanRead)
def get_plan(
    plan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanService(db).get_plan(plan_id, current_user)


@router.put("/plans/{plan_id}", response_model=PlanRead)
def update_plan(
    plan_id: uuid.UUID,
    payload: PlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanService(db).update_plan(plan_id, payload, current_user)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    PlanService(db).delete_plan(plan_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/plans/{plan_id}/issues", response_model=list[WorkItemSummary])
def list_plan_issues(
    plan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanService(db).list_issues(plan_id, current_user)


@router.get("/projects/{project_id}/roadmap", response_model=RoadmapRead)
def get_roadmap(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"items": PlanService(db).roadmap(project_id, current_user)}
