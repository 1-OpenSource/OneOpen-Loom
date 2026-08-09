import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.project import Project


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        workspace_id: uuid.UUID,
        name: str,
        key: str,
        description: str | None,
        lead_user_id: uuid.UUID | None,
    ) -> Project:
        project = Project(
            workspace_id=workspace_id,
            name=name,
            key=key.upper(),
            description=description,
            lead_user_id=lead_user_id,
        )
        self.db.add(project)
        self.db.flush()
        return project

    def get(self, project_id: uuid.UUID) -> Project | None:
        return self.db.get(Project, project_id)

    def get_by_key(self, workspace_id: uuid.UUID, key: str) -> Project | None:
        statement = select(Project).where(
            Project.workspace_id == workspace_id,
            func.lower(Project.key) == key.lower(),
        )
        return self.db.scalar(statement)

    def list_by_workspace(self, workspace_id: uuid.UUID) -> list[Project]:
        statement = (
            select(Project)
            .where(Project.workspace_id == workspace_id)
            .order_by(Project.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def update(self, project: Project, **values: object) -> Project:
        if "key" in values and isinstance(values["key"], str):
            values["key"] = values["key"].upper()
        for key, value in values.items():
            setattr(project, key, value)
        self.db.flush()
        return project

    def delete(self, project: Project) -> None:
        self.db.delete(project)
        self.db.flush()
