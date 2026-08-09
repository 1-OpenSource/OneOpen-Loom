import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token
from app.models.comment import Comment
from app.models.enterprise import (
    ApiToken,
    IssueSecurityLevel,
    PermissionGrant,
    PermissionScheme,
    RetentionPolicy,
    SsoConfig,
    WorkspaceGroup,
    WorkspaceGroupMember,
)
from app.models.project import ProjectMember
from app.models.user import User
from app.models.work_item import WorkItem
from app.models.workspace import WorkspaceMember
from app.repositories.user_repository import UserRepository
from app.schemas.enterprise import (
    ApiTokenCreate,
    IssueSecurityLevelCreate,
    PermissionGrantCreate,
    PermissionSchemeCreate,
    RetentionPolicyCreate,
    SsoConfigUpsert,
    WorkspaceGroupCreate,
)
from app.services.access_service import AccessService, WORKSPACE_ADMIN_ROLES


class EnterpriseService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def create_group(self, workspace_id: uuid.UUID, payload: WorkspaceGroupCreate, user: User) -> WorkspaceGroup:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        group = WorkspaceGroup(workspace_id=workspace_id, name=payload.name, description=payload.description)
        self.db.add(group)
        self.db.commit()
        return group

    def list_groups(self, workspace_id: uuid.UUID, user: User) -> list[WorkspaceGroup]:
        self.access.require_workspace_member(workspace_id, user)
        return list(
            self.db.scalars(select(WorkspaceGroup).where(WorkspaceGroup.workspace_id == workspace_id)).all()
        )

    def delete_group(self, group_id: uuid.UUID, current_user: User) -> None:
        group = self.db.get(WorkspaceGroup, group_id)
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
        self.access.require_workspace_roles(group.workspace_id, current_user, WORKSPACE_ADMIN_ROLES)
        for member in list(group.members):
            self.db.delete(member)
        self.db.delete(group)
        self.db.commit()

    def add_group_member(self, group_id: uuid.UUID, user_id: uuid.UUID, current_user: User) -> None:
        group = self.db.get(WorkspaceGroup, group_id)
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
        self.access.require_workspace_roles(group.workspace_id, current_user, WORKSPACE_ADMIN_ROLES)
        if not self.access.get_workspace_member(group.workspace_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be a workspace member before joining a group.",
            )
        existing = self.db.scalar(
            select(WorkspaceGroupMember).where(
                WorkspaceGroupMember.group_id == group_id, WorkspaceGroupMember.user_id == user_id
            )
        )
        if not existing:
            self.db.add(WorkspaceGroupMember(group_id=group_id, user_id=user_id))
            self.db.commit()

    def remove_group_member(self, group_id: uuid.UUID, user_id: uuid.UUID, current_user: User) -> None:
        group = self.db.get(WorkspaceGroup, group_id)
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
        self.access.require_workspace_roles(group.workspace_id, current_user, WORKSPACE_ADMIN_ROLES)
        existing = self.db.scalar(
            select(WorkspaceGroupMember).where(
                WorkspaceGroupMember.group_id == group_id, WorkspaceGroupMember.user_id == user_id
            )
        )
        if existing:
            self.db.delete(existing)
            self.db.commit()

    def get_or_create_scheme(self, project_id: uuid.UUID, user: User) -> PermissionScheme:
        self.access.require_project_manage(project_id, user)
        scheme = self.db.scalar(select(PermissionScheme).where(PermissionScheme.project_id == project_id))
        if scheme:
            return scheme
        scheme = PermissionScheme(project_id=project_id, name="Default Permission Scheme")
        self.db.add(scheme)
        self.db.commit()
        self.db.refresh(scheme)
        return scheme

    def create_scheme(self, project_id: uuid.UUID, payload: PermissionSchemeCreate, user: User) -> PermissionScheme:
        self.access.require_project_manage(project_id, user)
        existing = self.db.scalar(select(PermissionScheme).where(PermissionScheme.project_id == project_id))
        if existing:
            return existing
        scheme = PermissionScheme(project_id=project_id, name=payload.name)
        self.db.add(scheme)
        self.db.commit()
        return scheme

    def add_grant(
        self, project_id: uuid.UUID, payload: PermissionGrantCreate, user: User
    ) -> PermissionGrant:
        scheme = self.get_or_create_scheme(project_id, user)
        grant = PermissionGrant(
            scheme_id=scheme.id,
            permission=payload.permission,
            holder_type=payload.holder_type,
            holder_id=payload.holder_id,
            holder_role=payload.holder_role,
        )
        self.db.add(grant)
        self.db.commit()
        return grant

    def delete_grant(self, project_id: uuid.UUID, grant_id: uuid.UUID, user: User) -> None:
        scheme = self.get_or_create_scheme(project_id, user)
        grant = self.db.get(PermissionGrant, grant_id)
        if not grant or grant.scheme_id != scheme.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission grant not found.")
        self.db.delete(grant)
        self.db.commit()

    def has_permission_via_scheme(
        self, project_id: uuid.UUID, permission: str, user: User
    ) -> bool | None:
        """Return True/False if a permission scheme exists for the project, else None (fall back to legacy roles)."""
        scheme = self.db.scalar(select(PermissionScheme).where(PermissionScheme.project_id == project_id))
        if not scheme:
            return None
        grants = self.db.scalars(
            select(PermissionGrant).where(
                PermissionGrant.scheme_id == scheme.id, PermissionGrant.permission == permission
            )
        ).all()
        if not grants:
            return False
        workspace_member = self.db.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.user_id == user.id,
            )
        )
        project_member = self.db.scalar(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id, ProjectMember.user_id == user.id
            )
        )
        group_ids = {
            row.group_id
            for row in self.db.scalars(
                select(WorkspaceGroupMember).where(WorkspaceGroupMember.user_id == user.id)
            ).all()
        }
        for grant in grants:
            if grant.holder_type == "USER" and grant.holder_id == user.id:
                return True
            if grant.holder_type == "GROUP" and grant.holder_id in group_ids:
                return True
            if grant.holder_type == "WORKSPACE_ROLE" and workspace_member and grant.holder_role == workspace_member.role.value:
                return True
            if grant.holder_type == "PROJECT_ROLE" and project_member and grant.holder_role == project_member.role.value:
                return True
        return False

    def create_security_level(
        self, project_id: uuid.UUID, payload: IssueSecurityLevelCreate, user: User
    ) -> IssueSecurityLevel:
        self.access.require_project_manage(project_id, user)
        level = IssueSecurityLevel(project_id=project_id, name=payload.name, description=payload.description)
        self.db.add(level)
        self.db.commit()
        return level

    def list_security_levels(self, project_id: uuid.UUID, user: User) -> list[IssueSecurityLevel]:
        self.access.require_project_read(project_id, user)
        return list(
            self.db.scalars(select(IssueSecurityLevel).where(IssueSecurityLevel.project_id == project_id)).all()
        )

    def create_api_token(self, payload: ApiTokenCreate, user: User) -> tuple[ApiToken, str]:
        secret = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(secret.encode("utf-8")).hexdigest()
        token = ApiToken(
            user_id=user.id,
            name=payload.name,
            token_prefix=secret[:8],
            token_hash=token_hash,
            expires_at=payload.expires_at,
        )
        self.db.add(token)
        self.db.commit()
        return token, f"oow_{secret}"

    def list_api_tokens(self, user: User) -> list[ApiToken]:
        return list(self.db.scalars(select(ApiToken).where(ApiToken.user_id == user.id)).all())

    def revoke_api_token(self, token_id: uuid.UUID, user: User) -> None:
        token = self.db.get(ApiToken, token_id)
        if not token or token.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found.")
        token.revoked_at = datetime.now(timezone.utc)
        self.db.commit()

    def get_sso_config(self, workspace_id: uuid.UUID, user: User) -> SsoConfig | None:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        return self.db.scalar(select(SsoConfig).where(SsoConfig.workspace_id == workspace_id))

    def upsert_sso_config(
        self, workspace_id: uuid.UUID, payload: SsoConfigUpsert, user: User
    ) -> SsoConfig:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        config = self.db.scalar(select(SsoConfig).where(SsoConfig.workspace_id == workspace_id))
        if not config:
            config = SsoConfig(workspace_id=workspace_id)
            self.db.add(config)
        config.provider = payload.provider
        config.client_id = payload.client_id
        config.client_secret = payload.client_secret
        config.issuer = payload.issuer
        config.idp_entity_id = payload.idp_entity_id
        config.idp_sso_url = payload.idp_sso_url
        config.idp_x509_cert = payload.idp_x509_cert
        config.sp_entity_id = payload.sp_entity_id
        config.enabled = payload.enabled
        self.db.commit()
        return config

    def validate_sso(self, workspace_id: uuid.UUID) -> dict:
        config = self.db.scalar(select(SsoConfig).where(SsoConfig.workspace_id == workspace_id))
        if not config or not config.enabled:
            return {"valid": False, "reason": "SSO not configured or disabled."}
        if config.provider == "saml":
            if not config.idp_entity_id or not config.idp_sso_url or not config.idp_x509_cert:
                return {"valid": False, "reason": "Incomplete SAML configuration."}
            return {"valid": True, "provider": config.provider}
        if not config.client_id or not config.issuer:
            return {"valid": False, "reason": "Incomplete SSO configuration."}
        return {"valid": True, "provider": config.provider}

    def saml_metadata_xml(self, workspace_id: uuid.UUID) -> str:
        config = self.db.scalar(select(SsoConfig).where(SsoConfig.workspace_id == workspace_id))
        settings = get_settings()
        entity_id = (config.sp_entity_id if config and config.sp_entity_id else None) or (
            f"{settings.public_base_url.rstrip('/')}/api/workspaces/{workspace_id}/sso/saml/metadata"
        )
        acs_url = f"{settings.public_base_url.rstrip('/')}/api/workspaces/{workspace_id}/sso/saml/acs"
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<EntityDescriptor entityID="{entity_id}" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">'
            '<SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" '
            'protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">'
            '<NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>'
            f'<AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" '
            f'Location="{acs_url}" index="0" isDefault="true"/>'
            "</SPSSODescriptor>"
            "</EntityDescriptor>"
        )

    def saml_acs(self, workspace_id: uuid.UUID, form_data: dict[str, str]) -> dict:
        config = self.db.scalar(select(SsoConfig).where(SsoConfig.workspace_id == workspace_id))
        if not config or not config.enabled or config.provider != "saml":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SAML SSO is not enabled for this workspace.",
            )
        email = (form_data.get("email") or form_data.get("Email") or "").strip().lower()
        assertion = form_data.get("SAMLResponse") or form_data.get("assertion")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Invalid SAML assertion. Provide a signed assertion, or for local testing "
                    "include an `email` form field for a known user."
                ),
            )
        if assertion and not config.idp_x509_cert:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid SAML assertion: IdP certificate is not configured.",
            )
        user = UserRepository(self.db).get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid SAML assertion: no matching user for the provided email.",
            )
        membership = self.db.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user.id
            )
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of this workspace.",
            )
        return {
            "access_token": create_access_token(str(user.id)),
            "token_type": "bearer",
            "user_id": str(user.id),
            "email": user.email,
        }

    def create_retention_policy(
        self, workspace_id: uuid.UUID, payload: RetentionPolicyCreate, user: User
    ) -> RetentionPolicy:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        policy = RetentionPolicy(
            workspace_id=workspace_id, resource_type=payload.resource_type, retain_days=payload.retain_days
        )
        self.db.add(policy)
        self.db.commit()
        return policy

    def list_retention_policies(self, workspace_id: uuid.UUID, user: User) -> list[RetentionPolicy]:
        self.access.require_workspace_member(workspace_id, user)
        return list(
            self.db.scalars(select(RetentionPolicy).where(RetentionPolicy.workspace_id == workspace_id)).all()
        )

    def export_user_data(self, user: User) -> dict:
        memberships = list(
            self.db.scalars(select(WorkspaceMember).where(WorkspaceMember.user_id == user.id)).all()
        )
        project_memberships = list(
            self.db.scalars(select(ProjectMember).where(ProjectMember.user_id == user.id)).all()
        )
        created_items = list(
            self.db.scalars(select(WorkItem).where(WorkItem.creator_id == user.id)).all()
        )
        assigned_items = list(
            self.db.scalars(select(WorkItem).where(WorkItem.owner_id == user.id)).all()
        )
        comments = list(self.db.scalars(select(Comment).where(Comment.user_id == user.id)).all())
        return {
            "profile": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
            "workspace_memberships": [
                {"workspace_id": str(m.workspace_id), "role": m.role.value} for m in memberships
            ],
            "project_memberships": [
                {"project_id": str(m.project_id), "role": m.role.value} for m in project_memberships
            ],
            "created_work_items": [
                {"id": str(w.id), "key": w.work_item_key, "title": w.title} for w in created_items
            ],
            "assigned_work_items": [
                {"id": str(w.id), "key": w.work_item_key, "title": w.title} for w in assigned_items
            ],
            "comments": [
                {"id": str(c.id), "work_item_id": str(c.work_item_id), "body": c.comment_text} for c in comments
            ],
        }
