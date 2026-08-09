import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity


class ActivityRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        actor_user_id: uuid.UUID,
        action: str,
        work_item_id: uuid.UUID | None = None,
        project_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        field_name: str | None = None,
        old_value: str | None = None,
        new_value: str | None = None,
    ) -> Activity:
        activity = Activity(
            actor_user_id=actor_user_id,
            action=action,
            work_item_id=work_item_id,
            project_id=project_id,
            workspace_id=workspace_id,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
        )
        self.db.add(activity)
        self.db.flush()
        return activity

    def list_by_work_item(self, work_item_id: uuid.UUID) -> list[Activity]:
        statement = (
            select(Activity)
            .where(Activity.work_item_id == work_item_id)
            .order_by(Activity.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def list_by_project(self, project_id: uuid.UUID) -> list[Activity]:
        statement = (
            select(Activity)
            .where(Activity.project_id == project_id)
            .order_by(Activity.created_at.desc())
        )
        return list(self.db.scalars(statement).all())
