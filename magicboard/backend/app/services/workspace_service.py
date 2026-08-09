import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.schemas.workspace import WorkspaceCreate, WorkspaceMemberAdd, WorkspaceUpdate
from app.services.access_service import WORKSPACE_ADMIN_ROLES, AccessService


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return normalized or "workspace"


class WorkspaceService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def create_workspace(self, payload: WorkspaceCreate, user: User) -> Workspace:
        base = slugify(payload.slug or payload.name)
        slug = base
        suffix = 1
        while self.db.scalar(select(Workspace).where(Workspace.slug == slug)):
            slug = f"{base}-{suffix}"
            suffix += 1
        workspace = Workspace(
            name=payload.name.strip(),
            slug=slug,
            description=payload.description,
            visibility=payload.visibility,
            created_by=user.id,
        )
        self.db.add(workspace)
        self.db.flush()
        self.db.add(
            WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role=WorkspaceRole.OWNER)
        )
        self.db.commit()
        self.db.refresh(workspace)
        return workspace

    def list_workspaces(self, user: User) -> list[Workspace]:
        return list(
            self.db.scalars(
                select(Workspace)
                .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
                .where(
                    WorkspaceMember.user_id == user.id,
                    Workspace.deleted_at.is_(None),
                )
                .order_by(Workspace.name.asc())
            ).all()
        )

    def get_workspace(self, workspace_id: uuid.UUID, user: User) -> Workspace:
        self.access.require_workspace_member(workspace_id, user)
        return self.access.get_workspace(workspace_id)

    def update_workspace(self, workspace_id: uuid.UUID, payload: WorkspaceUpdate, user: User) -> Workspace:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        workspace = self.access.get_workspace(workspace_id)
        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(workspace, key, value)
        self.db.commit()
        self.db.refresh(workspace)
        return workspace

    def delete_workspace(self, workspace_id: uuid.UUID, user: User) -> None:
        self.access.require_workspace_roles(workspace_id, user, {WorkspaceRole.OWNER})
        workspace = self.access.get_workspace(workspace_id)
        workspace.deleted_at = datetime.now(timezone.utc)
        self.db.commit()

    def list_members(self, workspace_id: uuid.UUID, user: User) -> list[WorkspaceMember]:
        self.access.require_workspace_member(workspace_id, user)
        return list(
            self.db.scalars(
                select(WorkspaceMember)
                .options(joinedload(WorkspaceMember.user))
                .where(WorkspaceMember.workspace_id == workspace_id)
            ).all()
        )

    def add_member(self, workspace_id: uuid.UUID, payload: WorkspaceMemberAdd, user: User) -> WorkspaceMember:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        existing = self.access.get_workspace_member(workspace_id, payload.user_id)
        if existing:
            existing.role = payload.role
            self.db.commit()
            self.db.refresh(existing)
            return existing
        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=payload.user_id,
            role=payload.role,
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member
