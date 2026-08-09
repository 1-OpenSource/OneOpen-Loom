import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.service_desk import (
    ApprovalCreate,
    ApprovalDecision,
    ApprovalRead,
    CsatRead,
    CsatSubmit,
    QueueCreate,
    QueueRead,
    RequestTypeCreate,
    RequestTypeRead,
    SlaCalendarCreate,
    SlaCalendarRead,
    SlaGoalCreate,
    SlaGoalRead,
)
from app.schemas.work_item import WorkItemSummary
from app.services.service_desk_service import ServiceDeskService

router = APIRouter(tags=["service-desk"])


@router.post(
    "/projects/{project_id}/request-types", response_model=RequestTypeRead, status_code=status.HTTP_201_CREATED
)
def create_request_type(
    project_id: uuid.UUID,
    payload: RequestTypeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).create_request_type(project_id, payload, current_user)


@router.get("/projects/{project_id}/request-types", response_model=list[RequestTypeRead])
def list_request_types(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).list_request_types(project_id, current_user)


@router.post("/projects/{project_id}/queues", response_model=QueueRead, status_code=status.HTTP_201_CREATED)
def create_queue(
    project_id: uuid.UUID,
    payload: QueueCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).create_queue(project_id, payload, current_user)


@router.get("/projects/{project_id}/queues", response_model=list[QueueRead])
def list_queues(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).list_queues(project_id, current_user)


@router.get("/queues/{queue_id}/issues", response_model=list[WorkItemSummary])
def get_queue_issues(
    queue_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).queue_issues(queue_id, current_user)


@router.post(
    "/projects/{project_id}/sla-calendars", response_model=SlaCalendarRead, status_code=status.HTTP_201_CREATED
)
def create_sla_calendar(
    project_id: uuid.UUID,
    payload: SlaCalendarCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).create_sla_calendar(project_id, payload, current_user)


@router.get("/projects/{project_id}/sla-calendars", response_model=list[SlaCalendarRead])
def list_sla_calendars(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).list_sla_calendars(project_id, current_user)


@router.post("/projects/{project_id}/sla-goals", response_model=SlaGoalRead, status_code=status.HTTP_201_CREATED)
def create_sla_goal(
    project_id: uuid.UUID,
    payload: SlaGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).create_sla_goal(project_id, payload, current_user)


@router.get("/projects/{project_id}/sla-goals", response_model=list[SlaGoalRead])
def list_sla_goals(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).list_sla_goals(project_id, current_user)


@router.post(
    "/work-items/{work_item_id}/approvals", response_model=ApprovalRead, status_code=status.HTTP_201_CREATED
)
def create_approval(
    work_item_id: uuid.UUID,
    payload: ApprovalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).create_approval(work_item_id, payload, current_user)


@router.put("/approvals/{approval_id}/decision", response_model=ApprovalRead)
def decide_approval(
    approval_id: uuid.UUID,
    payload: ApprovalDecision,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).decide_approval(approval_id, payload, current_user)


@router.get("/work-items/{work_item_id}/approvals", response_model=list[ApprovalRead])
def list_approvals(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).list_approvals(work_item_id, current_user)


@router.post(
    "/work-items/{work_item_id}/csat", response_model=CsatRead, status_code=status.HTTP_201_CREATED
)
def submit_csat(
    work_item_id: uuid.UUID,
    payload: CsatSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ServiceDeskService(db).submit_csat(work_item_id, payload, current_user)
