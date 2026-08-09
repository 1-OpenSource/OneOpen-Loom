import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.sprint import (
    SprintCompleteRequest,
    SprintCreate,
    SprintItemAdd,
    SprintItemRead,
    SprintMetricRead,
    SprintRead,
    SprintUpdate,
)
from app.services.sprint_service import SprintService

router = APIRouter(tags=["sprints"])


@router.post("/projects/{project_id}/sprints", response_model=SprintRead, status_code=status.HTTP_201_CREATED)
def create_sprint(
    project_id: uuid.UUID,
    payload: SprintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SprintService(db).create_sprint(project_id, payload, current_user)


@router.get("/projects/{project_id}/sprints", response_model=list[SprintRead])
def list_sprints(
    project_id: uuid.UUID,
    state: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SprintService(db).list_sprints(project_id, current_user, state=state)


@router.get("/sprints/{sprint_id}", response_model=SprintRead)
def get_sprint(
    sprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SprintService(db).get_sprint(sprint_id, current_user)


@router.put("/sprints/{sprint_id}", response_model=SprintRead)
def update_sprint(
    sprint_id: uuid.UUID,
    payload: SprintUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SprintService(db).update_sprint(sprint_id, payload, current_user)


@router.delete("/sprints/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sprint(
    sprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SprintService(db).delete_sprint(sprint_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/sprints/{sprint_id}/start", response_model=SprintRead)
def start_sprint(
    sprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SprintService(db).start_sprint(sprint_id, current_user)


@router.post("/sprints/{sprint_id}/complete", response_model=SprintRead)
def complete_sprint(
    sprint_id: uuid.UUID,
    payload: SprintCompleteRequest = SprintCompleteRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SprintService(db).complete_sprint(sprint_id, payload, current_user)


@router.post("/sprints/{sprint_id}/items", response_model=SprintItemRead, status_code=status.HTTP_201_CREATED)
def add_sprint_item(
    sprint_id: uuid.UUID,
    payload: SprintItemAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SprintService(db).add_item(sprint_id, payload, current_user)


@router.get("/sprints/{sprint_id}/items", response_model=list[SprintItemRead])
def list_sprint_items(
    sprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SprintService(db).list_items(sprint_id, current_user)


@router.delete("/sprints/{sprint_id}/items/{work_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_sprint_item(
    sprint_id: uuid.UUID,
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SprintService(db).remove_item(sprint_id, work_item_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/sprints/{sprint_id}/metrics", response_model=list[SprintMetricRead])
def list_sprint_metrics(
    sprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SprintService(db).list_metrics(sprint_id, current_user)
