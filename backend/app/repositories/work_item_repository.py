import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.work_item import WorkItem, WorkItemStatus


class WorkItemRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_sequence_number(self, project_id: uuid.UUID) -> int:
        statement = select(func.coalesce(func.max(WorkItem.sequence_number), 0) + 1).where(
            WorkItem.project_id == project_id
        )
        return int(self.db.scalar(statement) or 1)

    def create(self, **values: object) -> WorkItem:
        work_item = WorkItem(**values)
        self.db.add(work_item)
        self.db.flush()
        return work_item

    def get(self, work_item_id: uuid.UUID) -> WorkItem | None:
        return self.db.get(WorkItem, work_item_id)

    def list_by_project(self, project_id: uuid.UUID) -> list[WorkItem]:
        statement = (
            select(WorkItem)
            .where(WorkItem.project_id == project_id)
            .order_by(WorkItem.sequence_number.asc())
        )
        return list(self.db.scalars(statement).all())

    def list_by_project_and_status(
        self, project_id: uuid.UUID, status: WorkItemStatus
    ) -> list[WorkItem]:
        statement = (
            select(WorkItem)
            .where(WorkItem.project_id == project_id, WorkItem.status == status)
            .order_by(WorkItem.sequence_number.asc())
        )
        return list(self.db.scalars(statement).all())

    def update(self, work_item: WorkItem, **values: object) -> WorkItem:
        for key, value in values.items():
            setattr(work_item, key, value)
        self.db.flush()
        return work_item

    def delete(self, work_item: WorkItem) -> None:
        self.db.delete(work_item)
        self.db.flush()
