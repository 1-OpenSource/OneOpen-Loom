import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.activity import ActivityRead
from app.services.activity_service import ActivityService

router = APIRouter(tags=["activity"])


@router.get("/work-items/{work_item_id}/activity", response_model=list[ActivityRead])
def list_work_item_activity(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ActivityService(db).list_for_work_item(work_item_id, current_user)


@router.get("/projects/{project_id}/activity", response_model=list[ActivityRead])
def list_project_activity(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ActivityService(db).list_for_project(project_id, current_user)


@router.get("/workspaces/{workspace_id}/activity", response_model=list[ActivityRead])
def list_workspace_activity(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ActivityService(db).list_for_workspace(workspace_id, current_user)
