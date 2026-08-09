import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.work_item import WorkboardRead
from app.services.work_item_service import WorkItemService

router = APIRouter(tags=["workboard"])


@router.get("/projects/{project_id}/workboard", response_model=WorkboardRead)
def get_workboard(
    project_id: uuid.UUID,
    search: str | None = Query(default=None),
    assignee_user_id: uuid.UUID | None = Query(default=None),
    priority_filter: str | None = Query(default=None, alias="priority"),
    type_filter: str | None = Query(default=None, alias="type"),
    label: str | None = Query(default=None),
    blocked: bool | None = Query(default=None),
    sprint_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).get_workboard(
        project_id,
        current_user,
        search=search,
        assignee_user_id=assignee_user_id,
        priority_filter=priority_filter,
        type_filter=type_filter,
        label=label,
        blocked=blocked,
        sprint_id=sprint_id,
    )
