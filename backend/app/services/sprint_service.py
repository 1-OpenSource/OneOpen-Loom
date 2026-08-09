import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.sprint import Sprint, SprintItem, SprintMetric, SprintState
from app.models.user import User
from app.models.work_item import WorkItem, WorkItemStatus
from app.schemas.sprint import SprintCompleteRequest, SprintCreate, SprintItemAdd, SprintUpdate
from app.services.access_service import AccessService


class SprintService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def _query_sprint(self, sprint_id: uuid.UUID) -> Sprint:
        sprint = self.db.get(Sprint, sprint_id)
        if not sprint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found.")
        return sprint

    def create_sprint(self, project_id: uuid.UUID, payload: SprintCreate, user: User) -> Sprint:
        self.access.require_project_write(project_id, user)
        sprint = Sprint(
            project_id=project_id,
            name=payload.name,
            goal=payload.goal,
            start_date=payload.start_date,
            end_date=payload.end_date,
        )
        self.db.add(sprint)
        self.db.commit()
        return sprint

    def list_sprints(self, project_id: uuid.UUID, user: User, *, state: str | None = None) -> list[Sprint]:
        self.access.require_project_read(project_id, user)
        statement = select(Sprint).where(Sprint.project_id == project_id)
        if state:
            statement = statement.where(Sprint.state == SprintState(state))
        statement = statement.order_by(Sprint.created_at.asc())
        return list(self.db.scalars(statement).all())

    def get_sprint(self, sprint_id: uuid.UUID, user: User) -> Sprint:
        sprint = self._query_sprint(sprint_id)
        self.access.require_project_read(sprint.project_id, user)
        return sprint

    def update_sprint(self, sprint_id: uuid.UUID, payload: SprintUpdate, user: User) -> Sprint:
        sprint = self._query_sprint(sprint_id)
        self.access.require_project_write(sprint.project_id, user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(sprint, key, value)
        self.db.commit()
        return sprint

    def delete_sprint(self, sprint_id: uuid.UUID, user: User) -> None:
        sprint = self._query_sprint(sprint_id)
        self.access.require_project_write(sprint.project_id, user)
        self.db.delete(sprint)
        self.db.commit()

    def start_sprint(self, sprint_id: uuid.UUID, user: User) -> Sprint:
        sprint = self._query_sprint(sprint_id)
        self.access.require_project_write(sprint.project_id, user)
        if sprint.state != SprintState.FUTURE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only a FUTURE sprint can be started.",
            )
        active_exists = self.db.scalar(
            select(Sprint).where(Sprint.project_id == sprint.project_id, Sprint.state == SprintState.ACTIVE)
        )
        if active_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another sprint is already active for this project.",
            )
        sprint.state = SprintState.ACTIVE
        self.db.commit()
        return sprint

    def complete_sprint(self, sprint_id: uuid.UUID, payload: SprintCompleteRequest, user: User) -> Sprint:
        sprint = self._query_sprint(sprint_id)
        self.access.require_project_write(sprint.project_id, user)
        if sprint.state != SprintState.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only an ACTIVE sprint can be completed.",
            )

        sprint_items = list(
            self.db.scalars(
                select(SprintItem)
                .options(selectinload(SprintItem.work_item))
                .where(SprintItem.sprint_id == sprint.id)
            ).all()
        )
        committed_points = sum(item.committed_points or 0 for item in sprint_items)
        completed_points = 0
        incomplete_items: list[SprintItem] = []
        for item in sprint_items:
            work_item = item.work_item
            if work_item and work_item.status == WorkItemStatus.DONE:
                completed_points += item.committed_points or work_item.estimate_points or 0
            else:
                incomplete_items.append(item)

        self.db.add(
            SprintMetric(
                sprint_id=sprint.id,
                committed_points=committed_points,
                completed_points=completed_points,
            )
        )

        if payload.incomplete_action == "next_sprint" and payload.next_sprint_id:
            next_sprint = self.db.get(Sprint, payload.next_sprint_id)
            if not next_sprint or next_sprint.project_id != sprint.project_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="next_sprint_id must belong to the same project.",
                )
            if next_sprint.state != SprintState.FUTURE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="next_sprint_id must reference a FUTURE sprint.",
                )
            for item in incomplete_items:
                item.sprint_id = next_sprint.id
        else:
            for item in incomplete_items:
                self.db.delete(item)

        sprint.state = SprintState.CLOSED
        sprint.complete_date = datetime.now(timezone.utc)
        self.db.commit()
        return sprint

    def add_item(self, sprint_id: uuid.UUID, payload: SprintItemAdd, user: User) -> SprintItem:
        sprint = self._query_sprint(sprint_id)
        self.access.require_project_write(sprint.project_id, user)
        work_item = self.db.get(WorkItem, payload.work_item_id)
        if not work_item or work_item.project_id != sprint.project_id or work_item.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Work item must belong to the same project.",
            )
        existing = self.db.scalar(select(SprintItem).where(SprintItem.work_item_id == work_item.id))
        if existing:
            existing.sprint_id = sprint.id
            existing.committed_points = payload.committed_points
            self.db.commit()
            return existing
        item = SprintItem(
            sprint_id=sprint.id,
            work_item_id=work_item.id,
            committed_points=payload.committed_points,
        )
        self.db.add(item)
        self.db.commit()
        return item

    def remove_item(self, sprint_id: uuid.UUID, work_item_id: uuid.UUID, user: User) -> None:
        sprint = self._query_sprint(sprint_id)
        self.access.require_project_write(sprint.project_id, user)
        item = self.db.scalar(
            select(SprintItem).where(SprintItem.sprint_id == sprint.id, SprintItem.work_item_id == work_item_id)
        )
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint item not found.")
        self.db.delete(item)
        self.db.commit()

    def list_items(self, sprint_id: uuid.UUID, user: User) -> list[SprintItem]:
        sprint = self._query_sprint(sprint_id)
        self.access.require_project_read(sprint.project_id, user)
        statement = (
            select(SprintItem)
            .options(selectinload(SprintItem.work_item))
            .where(SprintItem.sprint_id == sprint.id)
        )
        return list(self.db.scalars(statement).all())

    def list_metrics(self, sprint_id: uuid.UUID, user: User) -> list[SprintMetric]:
        sprint = self._query_sprint(sprint_id)
        self.access.require_project_read(sprint.project_id, user)
        statement = select(SprintMetric).where(SprintMetric.sprint_id == sprint.id).order_by(SprintMetric.created_at.asc())
        return list(self.db.scalars(statement).all())
