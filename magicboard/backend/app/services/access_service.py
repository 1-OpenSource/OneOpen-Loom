import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole

WORKSPACE_WRITE_ROLES = {WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER}
WORKSPACE_ADMIN_ROLES = {WorkspaceRole.OWNER, WorkspaceRole.ADMIN}


class AccessService:
    def __init__(self, db: Session):
        self.db = db

    def get_workspace(self, workspace_id: uuid.UUID) -> Workspace:
        workspace = self.db.get(Workspace, workspace_id)
        if not workspace or workspace.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return workspace

    def get_workspace_member(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember | None:
        return self.db.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )

    def require_workspace_member(self, workspace_id: uuid.UUID, user: User) -> WorkspaceMember:
        self.get_workspace(workspace_id)
        member = self.get_workspace_member(workspace_id, user.id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this workspace.",
            )
        return member

    def require_workspace_roles(
        self,
        workspace_id: uuid.UUID,
        user: User,
        allowed_roles: set[WorkspaceRole],
    ) -> WorkspaceMember:
        member = self.require_workspace_member(workspace_id, user)
        if member.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return member
