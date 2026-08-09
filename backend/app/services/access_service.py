import uuid
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectMember, ProjectRole, ProjectVisibility
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole

WORKSPACE_WRITE_ROLES = {WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER}
WORKSPACE_ADMIN_ROLES = {WorkspaceRole.OWNER, WorkspaceRole.ADMIN}
PROJECT_WRITE_ROLES = {ProjectRole.ADMIN, ProjectRole.DEVELOPER, ProjectRole.CONTRIBUTOR}
PROJECT_ADMIN_ROLES = {ProjectRole.ADMIN}


@dataclass(slots=True)
class ProjectAccessContext:
    project: Project
    workspace_member: WorkspaceMember
    project_member: ProjectMember | None


class AccessService:
    def __init__(self, db: Session):
        self.db = db

    def get_workspace(self, workspace_id: uuid.UUID) -> Workspace:
        workspace = self.db.get(Workspace, workspace_id)
        if not workspace or workspace.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return workspace

    def get_workspace_member(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember | None:
        statement = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        return self.db.scalar(statement)

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

    def get_project(self, project_id: uuid.UUID) -> Project:
        project = self.db.get(Project, project_id)
        if not project or project.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return project

    def get_project_member(self, project_id: uuid.UUID, user_id: uuid.UUID) -> ProjectMember | None:
        statement = select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        return self.db.scalar(statement)

    def get_project_access_context(self, project_id: uuid.UUID, user: User) -> ProjectAccessContext:
        project = self.get_project(project_id)
        workspace_member = self.require_workspace_member(project.workspace_id, user)
        project_member = self.get_project_member(project.id, user.id)
        return ProjectAccessContext(
            project=project,
            workspace_member=workspace_member,
            project_member=project_member,
        )

    def can_read_project(self, context: ProjectAccessContext, user: User) -> bool:
        if context.workspace_member.role in WORKSPACE_ADMIN_ROLES:
            return True
        if context.project.lead_user_id == user.id:
            return True
        if context.project.visibility == ProjectVisibility.PUBLIC:
            return True
        return context.project_member is not None

    def require_project_read(self, project_id: uuid.UUID, user: User) -> ProjectAccessContext:
        context = self.get_project_access_context(project_id, user)
        if not self.can_read_project(context, user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this project.",
            )
        return context

    def require_project_manage(self, project_id: uuid.UUID, user: User) -> ProjectAccessContext:
        context = self.require_project_read(project_id, user)
        if context.workspace_member.role in WORKSPACE_ADMIN_ROLES:
            return context
        if context.project.lead_user_id == user.id:
            return context
        if context.project_member and context.project_member.role in PROJECT_ADMIN_ROLES:
            return context
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage this project.",
        )

    def require_project_write(self, project_id: uuid.UUID, user: User) -> ProjectAccessContext:
        context = self.require_project_read(project_id, user)
        if context.workspace_member.role == WorkspaceRole.VIEWER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Viewer access is read-only.",
            )
        if context.workspace_member.role in WORKSPACE_ADMIN_ROLES:
            return context
        if context.project.lead_user_id == user.id:
            return context
        if context.project.visibility == ProjectVisibility.PUBLIC and context.workspace_member.role in WORKSPACE_WRITE_ROLES:
            return context
        if context.project_member and context.project_member.role in PROJECT_WRITE_ROLES:
            return context
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this project.",
        )
