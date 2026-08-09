import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.board import (
    BoardColumnCreate,
    BoardColumnRead,
    BoardColumnUpdate,
    WorkflowStatusCreate,
    WorkflowStatusUpdate,
    WorkflowTransitionCreate,
    WorkflowTransitionRead,
    WorkflowTransitionRuleCreate,
    WorkflowTransitionRuleRead,
    WorkflowTransitionRuleUpdate,
)
from app.schemas.project import WorkflowStatusRead
from app.services.board_service import BoardService

router = APIRouter(tags=["board"])


@router.get("/projects/{project_id}/board/columns", response_model=list[BoardColumnRead])
def list_board_columns(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).list_columns(project_id, current_user)


@router.post(
    "/projects/{project_id}/board/columns", response_model=BoardColumnRead, status_code=status.HTTP_201_CREATED
)
def create_board_column(
    project_id: uuid.UUID,
    payload: BoardColumnCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).create_column(project_id, payload, current_user)


@router.put("/board/columns/{column_id}", response_model=BoardColumnRead)
def update_board_column(
    column_id: uuid.UUID,
    payload: BoardColumnUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).update_column(column_id, payload, current_user)


@router.delete("/board/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board_column(
    column_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    BoardService(db).delete_column(column_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/projects/{project_id}/statuses", response_model=WorkflowStatusRead, status_code=status.HTTP_201_CREATED
)
def create_workflow_status(
    project_id: uuid.UUID,
    payload: WorkflowStatusCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).create_status(project_id, payload, current_user)


@router.put("/statuses/{status_id}", response_model=WorkflowStatusRead)
def update_workflow_status(
    status_id: uuid.UUID,
    payload: WorkflowStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).update_status(status_id, payload, current_user)


@router.delete("/statuses/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow_status(
    status_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    BoardService(db).delete_status(status_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/projects/{project_id}/transitions", response_model=list[WorkflowTransitionRead])
def list_transitions(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).list_transitions(project_id, current_user)


@router.post(
    "/projects/{project_id}/transitions",
    response_model=WorkflowTransitionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_transition(
    project_id: uuid.UUID,
    payload: WorkflowTransitionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).create_transition(project_id, payload, current_user)


@router.delete("/transitions/{transition_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transition(
    transition_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    BoardService(db).delete_transition(transition_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/transitions/{transition_id}/rules", response_model=list[WorkflowTransitionRuleRead]
)
def list_transition_rules(
    transition_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).list_transition_rules(transition_id, current_user)


@router.post(
    "/transitions/{transition_id}/rules",
    response_model=WorkflowTransitionRuleRead,
    status_code=status.HTTP_201_CREATED,
)
def create_transition_rule(
    transition_id: uuid.UUID,
    payload: WorkflowTransitionRuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).create_transition_rule(transition_id, payload, current_user)


@router.put("/transition-rules/{rule_id}", response_model=WorkflowTransitionRuleRead)
def update_transition_rule(
    rule_id: uuid.UUID,
    payload: WorkflowTransitionRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BoardService(db).update_transition_rule(rule_id, payload, current_user)


@router.delete("/transition-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transition_rule(
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    BoardService(db).delete_transition_rule(rule_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
