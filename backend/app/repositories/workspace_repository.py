import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole


class WorkspaceRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, *, name: str, slug: str, created_by: uuid.UUID) -> Workspace:
        workspace = Workspace(name=name, slug=slug, created_by=created_by)
        self.db.add(workspace)
        self.db.flush()
        return workspace

    def get(self, workspace_id: uuid.UUID) -> Workspace | None:
        return self.db.get(Workspace, workspace_id)

    def get_by_slug(self, slug: str) -> Workspace | None:
        statement = select(Workspace).where(func.lower(Workspace.slug) == slug.lower())
        return self.db.scalar(statement)

    def list_for_user(self, user_id: uuid.UUID) -> list[Workspace]:
        statement = (
            select(Workspace)
            .join(WorkspaceMember)
            .where(WorkspaceMember.user_id == user_id)
            .order_by(Workspace.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def update(self, workspace: Workspace, **values: object) -> Workspace:
        for key, value in values.items():
            setattr(workspace, key, value)
        self.db.flush()
        return workspace

    def delete(self, workspace: Workspace) -> None:
        self.db.delete(workspace)
        self.db.flush()

    def add_member(
        self, *, workspace_id: uuid.UUID, user_id: uuid.UUID, role: WorkspaceRole
    ) -> WorkspaceMember:
        member = WorkspaceMember(workspace_id=workspace_id, user_id=user_id, role=role)
        self.db.add(member)
        self.db.flush()
        return member

    def get_member(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember | None:
        statement = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        return self.db.scalar(statement)

    def list_members(self, workspace_id: uuid.UUID) -> list[WorkspaceMember]:
        statement = (
            select(WorkspaceMember)
            .options(joinedload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id)
            .order_by(WorkspaceMember.created_at.asc())
        )
        return list(self.db.scalars(statement).all())

    def update_member_role(
        self, member: WorkspaceMember, role: WorkspaceRole
    ) -> WorkspaceMember:
        member.role = role
        self.db.flush()
        return member

    def remove_member(self, member: WorkspaceMember) -> None:
        self.db.delete(member)
        self.db.flush()

    def count_owners(self, workspace_id: uuid.UUID) -> int:
        statement = select(func.count()).select_from(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.role == WorkspaceRole.OWNER,
        )
        return int(self.db.scalar(statement) or 0)
