import re
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.activity import AuditEntityType, AuditEvent
from app.models.project import Project
from app.models.user import User
from app.models.work_item import WorkItem
from app.models.workspace import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceInvitationStatus,
    WorkspaceMember,
    WorkspaceRole,
)
from app.repositories.user_repository import UserRepository
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceInvitationCreate,
    WorkspaceMemberAdd,
    WorkspaceRead,
    WorkspaceUpdate,
)
from app.services.access_service import WORKSPACE_ADMIN_ROLES, WORKSPACE_WRITE_ROLES, AccessService
from app.services.audit_service import AuditService


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return normalized or "workspace"


class WorkspaceService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)
        self.audit = AuditService(db)
        self.users = UserRepository(db)

    def _query_workspace(self, workspace_id: uuid.UUID) -> Workspace:
        statement = (
            select(Workspace)
            .options(
                selectinload(Workspace.members).joinedload(WorkspaceMember.user),
                selectinload(Workspace.invitations).joinedload(WorkspaceInvitation.invited_by),
            )
            .where(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
        )
        workspace = self.db.scalar(statement)
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return workspace

    def create_workspace(self, payload: WorkspaceCreate, user: User) -> Workspace:
        slug = slugify(payload.slug or payload.name)
        existing = self.db.scalar(
            select(Workspace).where(func.lower(Workspace.slug) == slug.lower(), Workspace.deleted_at.is_(None))
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A workspace with this slug already exists.",
            )

        workspace = Workspace(
            name=payload.name,
            slug=slug,
            description=payload.description,
            logo_url=payload.logo_url,
            accent_color=payload.accent_color or "#e86a17",
            brand_name=payload.brand_name,
            brand_tagline=payload.brand_tagline,
            visibility=payload.visibility,
            created_by=user.id,
        )
        owner_member = WorkspaceMember(workspace=workspace, user_id=user.id, role=WorkspaceRole.OWNER)
        self.db.add_all([workspace, owner_member])
        self.db.flush()
        from app.services.admin_service import AdminService

        AdminService(self.db).seed_default_email_templates(workspace.id)
        self.audit.record(
            actor_user_id=user.id,
            action="workspace.created",
            entity_type=AuditEntityType.WORKSPACE,
            entity_id=str(workspace.id),
            entity_label=workspace.name,
            workspace_id=workspace.id,
        )
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A workspace with this slug already exists.",
            ) from exc
        return self._query_workspace(workspace.id)

    def list_workspaces(self, user: User) -> list[Workspace]:
        statement = (
            select(Workspace)
            .join(WorkspaceMember)
            .where(WorkspaceMember.user_id == user.id, Workspace.deleted_at.is_(None))
            .order_by(Workspace.updated_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_workspace(self, workspace_id: uuid.UUID, user: User) -> Workspace:
        self.access.require_workspace_member(workspace_id, user)
        return self._query_workspace(workspace_id)

    def update_workspace(self, workspace_id: uuid.UUID, payload: WorkspaceUpdate, user: User) -> Workspace:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        workspace = self.access.get_workspace(workspace_id)
        values = payload.model_dump(exclude_unset=True)
        if "slug" in values and values["slug"] is not None:
            values["slug"] = slugify(values["slug"])
            existing = self.db.scalar(
                select(Workspace).where(
                    func.lower(Workspace.slug) == values["slug"].lower(),
                    Workspace.id != workspace.id,
                    Workspace.deleted_at.is_(None),
                )
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A workspace with this slug already exists.",
                )

        for key, value in values.items():
            setattr(workspace, key, value)
        self.audit.record(
            actor_user_id=user.id,
            action="workspace.updated",
            entity_type=AuditEntityType.WORKSPACE,
            entity_id=str(workspace.id),
            entity_label=workspace.name,
            workspace_id=workspace.id,
        )
        self.db.commit()
        return self._query_workspace(workspace.id)

    def delete_workspace(self, workspace_id: uuid.UUID, user: User) -> None:
        self.access.require_workspace_roles(workspace_id, user, {WorkspaceRole.OWNER})
        workspace = self.access.get_workspace(workspace_id)
        workspace.deleted_at = datetime.now(timezone.utc)
        self.audit.record(
            actor_user_id=user.id,
            action="workspace.deleted",
            entity_type=AuditEntityType.WORKSPACE,
            entity_id=str(workspace.id),
            entity_label=workspace.name,
            workspace_id=workspace.id,
        )
        self.db.commit()

    def list_members(self, workspace_id: uuid.UUID, user: User) -> list[WorkspaceMember]:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(WorkspaceMember)
            .options(joinedload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id)
            .order_by(WorkspaceMember.created_at.asc())
        )
        return list(self.db.scalars(statement).all())

    def add_member(self, workspace_id: uuid.UUID, payload: WorkspaceMemberAdd, user: User) -> WorkspaceMember:
        current_member = self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        if payload.role == WorkspaceRole.OWNER and current_member.role != WorkspaceRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workspace owners can add another owner.",
            )
        target_user = self.users.get_by_id(payload.user_id)
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        existing = self.access.get_workspace_member(workspace_id, payload.user_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already a member of this workspace.",
            )

        member = WorkspaceMember(workspace_id=workspace_id, user_id=payload.user_id, role=payload.role)
        self.db.add(member)
        self.db.flush()
        self.audit.record(
            actor_user_id=user.id,
            action="workspace.member_added",
            entity_type=AuditEntityType.MEMBERSHIP,
            entity_id=str(member.id),
            entity_label=target_user.email,
            workspace_id=workspace_id,
            field_name="role",
            new_value=payload.role,
        )
        self.db.commit()
        statement = (
            select(WorkspaceMember)
            .options(joinedload(WorkspaceMember.user))
            .where(WorkspaceMember.id == member.id)
        )
        return self.db.scalar(statement)

    def update_member_role(
        self,
        workspace_id: uuid.UUID,
        target_user_id: uuid.UUID,
        role: WorkspaceRole,
        user: User,
    ) -> WorkspaceMember:
        current_member = self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        target_member = self.access.get_workspace_member(workspace_id, target_user_id)
        if not target_member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace member not found.")
        if role == WorkspaceRole.OWNER and current_member.role != WorkspaceRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workspace owners can promote another owner.",
            )
        if (
            target_member.role == WorkspaceRole.OWNER
            and role != WorkspaceRole.OWNER
            and self._count_workspace_owners(workspace_id) <= 1
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A workspace must keep at least one owner.",
            )

        old_role = target_member.role
        target_member.role = role
        self.audit.record(
            actor_user_id=user.id,
            action="workspace.member_role_updated",
            entity_type=AuditEntityType.MEMBERSHIP,
            entity_id=str(target_member.id),
            entity_label=str(target_user_id),
            workspace_id=workspace_id,
            field_name="role",
            old_value=old_role,
            new_value=role,
        )
        self.db.commit()
        statement = (
            select(WorkspaceMember)
            .options(joinedload(WorkspaceMember.user))
            .where(WorkspaceMember.id == target_member.id)
        )
        return self.db.scalar(statement)

    def remove_member(self, workspace_id: uuid.UUID, target_user_id: uuid.UUID, user: User) -> None:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        target_member = self.access.get_workspace_member(workspace_id, target_user_id)
        if not target_member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace member not found.")
        if (
            target_member.role == WorkspaceRole.OWNER
            and self._count_workspace_owners(workspace_id) <= 1
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A workspace must keep at least one owner.",
            )

        self.audit.record(
            actor_user_id=user.id,
            action="workspace.member_removed",
            entity_type=AuditEntityType.MEMBERSHIP,
            entity_id=str(target_member.id),
            entity_label=str(target_user_id),
            workspace_id=workspace_id,
        )
        self.db.delete(target_member)
        self.db.commit()

    def list_invitations(self, workspace_id: uuid.UUID, user: User) -> list[WorkspaceInvitation]:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(WorkspaceInvitation)
            .options(joinedload(WorkspaceInvitation.invited_by))
            .where(WorkspaceInvitation.workspace_id == workspace_id)
            .order_by(WorkspaceInvitation.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def create_invitation(
        self,
        workspace_id: uuid.UUID,
        payload: WorkspaceInvitationCreate,
        user: User,
    ) -> WorkspaceInvitation:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        existing_member = self.db.scalar(
            select(WorkspaceMember)
            .join(User)
            .where(
                WorkspaceMember.workspace_id == workspace_id,
                func.lower(User.email) == payload.email.lower(),
            )
        )
        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email already belongs to a workspace member.",
            )

        existing_invitation = self.db.scalar(
            select(WorkspaceInvitation).where(
                WorkspaceInvitation.workspace_id == workspace_id,
                func.lower(WorkspaceInvitation.email) == payload.email.lower(),
                WorkspaceInvitation.status == WorkspaceInvitationStatus.PENDING,
            )
        )
        if existing_invitation:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="There is already a pending invitation for this email.",
            )

        invitation = WorkspaceInvitation(
            workspace_id=workspace_id,
            email=payload.email.lower(),
            role=payload.role,
            token=secrets.token_urlsafe(24),
            invited_by_user_id=user.id,
        )
        self.db.add(invitation)
        self.db.flush()
        self.audit.record(
            actor_user_id=user.id,
            action="workspace.invitation_created",
            entity_type=AuditEntityType.INVITATION,
            entity_id=str(invitation.id),
            entity_label=invitation.email,
            workspace_id=workspace_id,
            field_name="role",
            new_value=payload.role,
        )
        self.db.commit()
        statement = (
            select(WorkspaceInvitation)
            .options(joinedload(WorkspaceInvitation.invited_by))
            .where(WorkspaceInvitation.id == invitation.id)
        )
        return self.db.scalar(statement)

    def resend_invitation(self, workspace_id: uuid.UUID, invitation_id: uuid.UUID, user: User) -> WorkspaceInvitation:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        invitation = self._get_invitation(workspace_id, invitation_id)
        if invitation.status != WorkspaceInvitationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending invitations can be resent.",
            )
        invitation.token = secrets.token_urlsafe(24)
        self.audit.record(
            actor_user_id=user.id,
            action="workspace.invitation_resent",
            entity_type=AuditEntityType.INVITATION,
            entity_id=str(invitation.id),
            entity_label=invitation.email,
            workspace_id=workspace_id,
        )
        self.db.commit()
        statement = (
            select(WorkspaceInvitation)
            .options(joinedload(WorkspaceInvitation.invited_by))
            .where(WorkspaceInvitation.id == invitation.id)
        )
        return self.db.scalar(statement)

    def revoke_invitation(self, workspace_id: uuid.UUID, invitation_id: uuid.UUID, user: User) -> None:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        invitation = self._get_invitation(workspace_id, invitation_id)
        invitation.status = WorkspaceInvitationStatus.REVOKED
        invitation.revoked_at = datetime.now(timezone.utc)
        self.audit.record(
            actor_user_id=user.id,
            action="workspace.invitation_revoked",
            entity_type=AuditEntityType.INVITATION,
            entity_id=str(invitation.id),
            entity_label=invitation.email,
            workspace_id=workspace_id,
        )
        self.db.commit()

    def accept_invitation(self, token: str, user: User) -> WorkspaceInvitation:
        statement = (
            select(WorkspaceInvitation)
            .options(joinedload(WorkspaceInvitation.invited_by))
            .where(
                WorkspaceInvitation.token == token,
                WorkspaceInvitation.status == WorkspaceInvitationStatus.PENDING,
            )
        )
        invitation = self.db.scalar(statement)
        if not invitation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
        if invitation.email.lower() != user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This invitation is assigned to a different email address.",
            )
        if self.access.get_workspace_member(invitation.workspace_id, user.id):
            invitation.status = WorkspaceInvitationStatus.ACCEPTED
            invitation.accepted_at = datetime.now(timezone.utc)
            self.db.commit()
            return invitation

        member = WorkspaceMember(workspace_id=invitation.workspace_id, user_id=user.id, role=invitation.role)
        invitation.status = WorkspaceInvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.now(timezone.utc)
        self.db.add(member)
        self.db.flush()
        self.audit.record(
            actor_user_id=user.id,
            action="workspace.invitation_accepted",
            entity_type=AuditEntityType.INVITATION,
            entity_id=str(invitation.id),
            entity_label=invitation.email,
            workspace_id=invitation.workspace_id,
        )
        self.db.commit()
        return invitation

    def get_overview(self, workspace_id: uuid.UUID, user: User) -> dict:
        self.access.require_workspace_member(workspace_id, user)
        total_projects = int(
            self.db.scalar(
                select(func.count()).select_from(Project).where(
                    Project.workspace_id == workspace_id,
                    Project.deleted_at.is_(None),
                )
            )
            or 0
        )
        total_work_items = int(
            self.db.scalar(
                select(func.count())
                .select_from(WorkItem)
                .join(Project)
                .where(
                    Project.workspace_id == workspace_id,
                    Project.deleted_at.is_(None),
                    WorkItem.deleted_at.is_(None),
                )
            )
            or 0
        )
        total_members = int(
            self.db.scalar(
                select(func.count()).select_from(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id)
            )
            or 0
        )
        total_open_invitations = int(
            self.db.scalar(
                select(func.count())
                .select_from(WorkspaceInvitation)
                .where(
                    WorkspaceInvitation.workspace_id == workspace_id,
                    WorkspaceInvitation.status == WorkspaceInvitationStatus.PENDING,
                )
            )
            or 0
        )
        recent_project_ids = [
            project_id
            for project_id in self.db.scalars(
                select(Project.id)
                .where(Project.workspace_id == workspace_id, Project.deleted_at.is_(None))
                .order_by(Project.updated_at.desc())
                .limit(5)
            ).all()
        ]
        recent_activity_count = int(
            self.db.scalar(
                select(func.count()).select_from(AuditEvent).where(AuditEvent.workspace_id == workspace_id)
            )
            or 0
        )
        rows = self.db.execute(
            select(WorkItem.status, func.count())
            .select_from(WorkItem)
            .join(Project)
            .where(
                Project.workspace_id == workspace_id,
                Project.deleted_at.is_(None),
                WorkItem.deleted_at.is_(None),
            )
            .group_by(WorkItem.status)
        ).all()
        return {
            "total_projects": total_projects,
            "total_work_items": total_work_items,
            "total_members": total_members,
            "total_open_invitations": total_open_invitations,
            "recent_project_ids": recent_project_ids,
            "recent_activity_count": recent_activity_count,
            "status_breakdown": {str(status.value if hasattr(status, "value") else status): count for status, count in rows},
        }

    def _count_workspace_owners(self, workspace_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count()).select_from(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.role == WorkspaceRole.OWNER,
                )
            )
            or 0
        )

    def _get_invitation(self, workspace_id: uuid.UUID, invitation_id: uuid.UUID) -> WorkspaceInvitation:
        invitation = self.db.scalar(
            select(WorkspaceInvitation).where(
                WorkspaceInvitation.workspace_id == workspace_id,
                WorkspaceInvitation.id == invitation_id,
            )
        )
        if not invitation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
        return invitation
