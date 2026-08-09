import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.activity import AuditEvent
from app.models.user import User
from app.models.work_item import WorkItem
from app.services.access_service import AccessService


class ActivityService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def list_for_work_item(self, work_item_id: uuid.UUID, user: User) -> list[AuditEvent]:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item or work_item.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_read(work_item.project_id, user)
        statement = (
            select(AuditEvent)
            .options(joinedload(AuditEvent.actor))
            .where(AuditEvent.work_item_id == work_item_id)
            .order_by(AuditEvent.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def list_for_project(self, project_id: uuid.UUID, user: User) -> list[AuditEvent]:
        self.access.require_project_read(project_id, user)
        statement = (
            select(AuditEvent)
            .options(joinedload(AuditEvent.actor))
            .where(AuditEvent.project_id == project_id)
            .order_by(AuditEvent.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def list_for_workspace(self, workspace_id: uuid.UUID, user: User) -> list[AuditEvent]:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(AuditEvent)
            .options(joinedload(AuditEvent.actor))
            .where(AuditEvent.workspace_id == workspace_id)
            .order_by(AuditEvent.created_at.desc())
        )
        return list(self.db.scalars(statement).all())
