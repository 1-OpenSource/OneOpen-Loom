import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.board import BoardColumn, BoardColumnStatus, WorkflowTransition, WorkflowTransitionRule
from app.models.project import Project, WorkflowStatus
from app.models.user import User
from app.schemas.board import (
    BoardColumnCreate,
    BoardColumnUpdate,
    WorkflowStatusCreate,
    WorkflowStatusUpdate,
    WorkflowTransitionCreate,
    WorkflowTransitionRuleCreate,
    WorkflowTransitionRuleUpdate,
)
from app.services.access_service import AccessService


class BoardService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def _require_project(self, project_id: uuid.UUID, user: User) -> Project:
        context = self.access.require_project_manage(project_id, user)
        return context.project

    def list_columns(self, project_id: uuid.UUID, user: User) -> list[BoardColumn]:
        self.access.require_project_read(project_id, user)
        statement = (
            select(BoardColumn)
            .options(selectinload(BoardColumn.statuses))
            .where(BoardColumn.project_id == project_id)
            .order_by(BoardColumn.position.asc())
        )
        return list(self.db.scalars(statement).all())

    def create_column(self, project_id: uuid.UUID, payload: BoardColumnCreate, user: User) -> BoardColumn:
        self._require_project(project_id, user)
        position = payload.position
        if position is None:
            max_position = self.db.scalar(
                select(BoardColumn.position)
                .where(BoardColumn.project_id == project_id)
                .order_by(BoardColumn.position.desc())
                .limit(1)
            )
            position = (max_position or 0) + 1
        column = BoardColumn(project_id=project_id, name=payload.name, position=position, wip_limit=payload.wip_limit)
        self.db.add(column)
        self.db.flush()
        for status_id in payload.status_ids:
            self._validate_status(project_id, status_id)
            self.db.add(BoardColumnStatus(column_id=column.id, status_id=status_id))
        self.db.commit()
        return self._query_column(column.id)

    def _query_column(self, column_id: uuid.UUID) -> BoardColumn:
        statement = (
            select(BoardColumn).options(selectinload(BoardColumn.statuses)).where(BoardColumn.id == column_id)
        )
        column = self.db.scalar(statement)
        if not column:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board column not found.")
        return column

    def _validate_status(self, project_id: uuid.UUID, status_id: uuid.UUID) -> WorkflowStatus:
        workflow_status = self.db.get(WorkflowStatus, status_id)
        if not workflow_status or workflow_status.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status must belong to the same project.",
            )
        return workflow_status

    def update_column(self, column_id: uuid.UUID, payload: BoardColumnUpdate, user: User) -> BoardColumn:
        column = self._query_column(column_id)
        self._require_project(column.project_id, user)
        values = payload.model_dump(exclude_unset=True, exclude={"status_ids"})
        for key, value in values.items():
            setattr(column, key, value)
        if payload.status_ids is not None:
            for existing in list(column.statuses):
                self.db.delete(existing)
            self.db.flush()
            for status_id in payload.status_ids:
                self._validate_status(column.project_id, status_id)
                self.db.add(BoardColumnStatus(column_id=column.id, status_id=status_id))
        self.db.commit()
        return self._query_column(column.id)

    def delete_column(self, column_id: uuid.UUID, user: User) -> None:
        column = self._query_column(column_id)
        self._require_project(column.project_id, user)
        self.db.delete(column)
        self.db.commit()

    def create_status(self, project_id: uuid.UUID, payload: WorkflowStatusCreate, user: User) -> WorkflowStatus:
        self._require_project(project_id, user)
        existing = self.db.scalar(
            select(WorkflowStatus).where(
                WorkflowStatus.project_id == project_id, WorkflowStatus.key == payload.key
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Status key already exists.")
        position = payload.position
        if position is None:
            max_position = self.db.scalar(
                select(WorkflowStatus.position)
                .where(WorkflowStatus.project_id == project_id)
                .order_by(WorkflowStatus.position.desc())
                .limit(1)
            )
            position = (max_position or 0) + 1
        workflow_status = WorkflowStatus(
            project_id=project_id,
            name=payload.name,
            key=payload.key,
            color=payload.color,
            category=payload.category,
            position=position,
        )
        self.db.add(workflow_status)
        self.db.commit()
        return workflow_status

    def update_status(
        self, status_id: uuid.UUID, payload: WorkflowStatusUpdate, user: User
    ) -> WorkflowStatus:
        workflow_status = self.db.get(WorkflowStatus, status_id)
        if not workflow_status:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status not found.")
        self._require_project(workflow_status.project_id, user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(workflow_status, key, value)
        self.db.commit()
        return workflow_status

    def delete_status(self, status_id: uuid.UUID, user: User) -> None:
        workflow_status = self.db.get(WorkflowStatus, status_id)
        if not workflow_status:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status not found.")
        self._require_project(workflow_status.project_id, user)
        self.db.delete(workflow_status)
        self.db.commit()

    def list_transitions(self, project_id: uuid.UUID, user: User) -> list[WorkflowTransition]:
        self.access.require_project_read(project_id, user)
        statement = select(WorkflowTransition).where(WorkflowTransition.project_id == project_id)
        return list(self.db.scalars(statement).all())

    def create_transition(
        self, project_id: uuid.UUID, payload: WorkflowTransitionCreate, user: User
    ) -> WorkflowTransition:
        self._require_project(project_id, user)
        self._validate_status(project_id, payload.from_status_id)
        self._validate_status(project_id, payload.to_status_id)
        existing = self.db.scalar(
            select(WorkflowTransition).where(
                WorkflowTransition.project_id == project_id,
                WorkflowTransition.from_status_id == payload.from_status_id,
                WorkflowTransition.to_status_id == payload.to_status_id,
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transition already exists.")
        transition = WorkflowTransition(
            project_id=project_id,
            from_status_id=payload.from_status_id,
            to_status_id=payload.to_status_id,
            name=payload.name,
        )
        self.db.add(transition)
        self.db.commit()
        return transition

    def delete_transition(self, transition_id: uuid.UUID, user: User) -> None:
        transition = self.db.get(WorkflowTransition, transition_id)
        if not transition:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transition not found.")
        self._require_project(transition.project_id, user)
        self.db.delete(transition)
        self.db.commit()

    def _require_transition(self, transition_id: uuid.UUID, user: User) -> WorkflowTransition:
        transition = self.db.get(WorkflowTransition, transition_id)
        if not transition:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transition not found.")
        self._require_project(transition.project_id, user)
        return transition

    def list_transition_rules(
        self, transition_id: uuid.UUID, user: User
    ) -> list[WorkflowTransitionRule]:
        transition = self.db.get(WorkflowTransition, transition_id)
        if not transition:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transition not found.")
        self.access.require_project_read(transition.project_id, user)
        return list(
            self.db.scalars(
                select(WorkflowTransitionRule)
                .where(WorkflowTransitionRule.transition_id == transition_id)
                .order_by(WorkflowTransitionRule.position.asc())
            ).all()
        )

    def create_transition_rule(
        self, transition_id: uuid.UUID, payload: WorkflowTransitionRuleCreate, user: User
    ) -> WorkflowTransitionRule:
        self._require_transition(transition_id, user)
        position = payload.position
        if position is None:
            max_position = self.db.scalar(
                select(WorkflowTransitionRule.position)
                .where(WorkflowTransitionRule.transition_id == transition_id)
                .order_by(WorkflowTransitionRule.position.desc())
                .limit(1)
            )
            position = (max_position or 0) + 1
        rule = WorkflowTransitionRule(
            transition_id=transition_id,
            kind=payload.kind,
            rule_type=payload.rule_type,
            config=payload.config or {},
            position=position,
        )
        self.db.add(rule)
        self.db.commit()
        return rule

    def update_transition_rule(
        self, rule_id: uuid.UUID, payload: WorkflowTransitionRuleUpdate, user: User
    ) -> WorkflowTransitionRule:
        rule = self.db.get(WorkflowTransitionRule, rule_id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transition rule not found.")
        self._require_transition(rule.transition_id, user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(rule, key, value)
        self.db.commit()
        return rule

    def delete_transition_rule(self, rule_id: uuid.UUID, user: User) -> None:
        rule = self.db.get(WorkflowTransitionRule, rule_id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transition rule not found.")
        self._require_transition(rule.transition_id, user)
        self.db.delete(rule)
        self.db.commit()
