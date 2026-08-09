from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.admin import (
    EmailTemplate,
    EmailTemplateKey,
    IssueTypeScheme,
    IssueTypeSchemeItem,
    WorkspaceDnsProvider,
    WorkspaceDomain,
    WorkspaceSmtpSettings,
)
from app.models.project import Project
from app.models.user import User
from app.schemas.admin import (
    EmailTemplateUpsert,
    IssueTypeSchemeCreate,
    IssueTypeSchemeUpdate,
    SmtpTestRequest,
    WorkspaceDnsProviderUpsert,
    WorkspaceDomainCreate,
    WorkspaceDomainUpdate,
    WorkspaceSmtpSettingsRead,
    WorkspaceSmtpSettingsUpsert,
)
from app.services.access_service import WORKSPACE_ADMIN_ROLES, AccessService
from app.services.dns_provider import MockDnsProvider, get_dns_provider
from app.services.mail_service import MailService

DEFAULT_EMAIL_TEMPLATES = [
    {
        "key": EmailTemplateKey.INVITE.value,
        "name": "Workspace invitation",
        "subject": "You're invited to {{workspace_name}}",
        "body_html": (
            "<p>Hello,</p>"
            "<p>You have been invited to join <strong>{{workspace_name}}</strong> on OneOpen Workboard.</p>"
            "<p><a href=\"{{invite_url}}\">Accept invitation</a></p>"
        ),
        "body_text": (
            "You have been invited to join {{workspace_name}} on OneOpen Workboard.\n"
            "Accept: {{invite_url}}\n"
        ),
    },
    {
        "key": EmailTemplateKey.NOTIFICATION.value,
        "name": "Notification",
        "subject": "{{notification_title}}",
        "body_html": "<p>{{notification_body}}</p>",
        "body_text": "{{notification_body}}\n",
    },
]


def smtp_to_read(settings: WorkspaceSmtpSettings) -> WorkspaceSmtpSettingsRead:
    return WorkspaceSmtpSettingsRead(
        id=settings.id,
        workspace_id=settings.workspace_id,
        host=settings.host,
        port=settings.port,
        username=settings.username,
        password_set=bool(settings.password),
        use_tls=settings.use_tls,
        from_email=settings.from_email,
        from_name=settings.from_name,
        enabled=settings.enabled,
        updated_at=settings.updated_at,
    )


class AdminService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)
        self.mail = MailService(db)

    def seed_default_email_templates(self, workspace_id: uuid.UUID) -> list[EmailTemplate]:
        existing = {
            row.key: row
            for row in self.db.scalars(
                select(EmailTemplate).where(EmailTemplate.workspace_id == workspace_id)
            ).all()
        }
        created: list[EmailTemplate] = []
        for template in DEFAULT_EMAIL_TEMPLATES:
            if template["key"] in existing:
                continue
            row = EmailTemplate(
                workspace_id=workspace_id,
                key=template["key"],
                name=template["name"],
                subject=template["subject"],
                body_html=template["body_html"],
                body_text=template["body_text"],
            )
            self.db.add(row)
            created.append(row)
        if created:
            self.db.flush()
        return list(
            self.db.scalars(select(EmailTemplate).where(EmailTemplate.workspace_id == workspace_id)).all()
        )

    def get_smtp_settings(self, workspace_id: uuid.UUID, user: User) -> WorkspaceSmtpSettingsRead | None:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        settings = self.db.scalar(
            select(WorkspaceSmtpSettings).where(WorkspaceSmtpSettings.workspace_id == workspace_id)
        )
        return smtp_to_read(settings) if settings else None

    def upsert_smtp_settings(
        self, workspace_id: uuid.UUID, payload: WorkspaceSmtpSettingsUpsert, user: User
    ) -> WorkspaceSmtpSettingsRead:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        settings = self.db.scalar(
            select(WorkspaceSmtpSettings).where(WorkspaceSmtpSettings.workspace_id == workspace_id)
        )
        if not settings:
            settings = WorkspaceSmtpSettings(workspace_id=workspace_id)
            self.db.add(settings)
        settings.host = payload.host
        settings.port = payload.port
        settings.username = payload.username
        if payload.password is not None:
            settings.password = payload.password
        settings.use_tls = payload.use_tls
        settings.from_email = str(payload.from_email) if payload.from_email else None
        settings.from_name = payload.from_name
        settings.enabled = payload.enabled
        self.db.commit()
        self.db.refresh(settings)
        return smtp_to_read(settings)

    def test_smtp(self, workspace_id: uuid.UUID, payload: SmtpTestRequest, user: User) -> dict:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        result = self.mail.send_email(
            to_email=str(payload.to_email),
            subject="OneOpen Workboard SMTP test",
            body_text="This is a test email from OneOpen Workboard SMTP settings.",
            body_html="<p>This is a test email from OneOpen Workboard SMTP settings.</p>",
            workspace_id=workspace_id,
        )
        if not result.get("sent"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("reason") or "Failed to send test email.",
            )
        return result

    def list_email_templates(self, workspace_id: uuid.UUID, user: User) -> list[EmailTemplate]:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        templates = self.seed_default_email_templates(workspace_id)
        self.db.commit()
        return templates

    def upsert_email_templates(
        self, workspace_id: uuid.UUID, payloads: list[EmailTemplateUpsert], user: User
    ) -> list[EmailTemplate]:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        self.seed_default_email_templates(workspace_id)
        by_key = {
            row.key: row
            for row in self.db.scalars(
                select(EmailTemplate).where(EmailTemplate.workspace_id == workspace_id)
            ).all()
        }
        for payload in payloads:
            row = by_key.get(payload.key)
            if not row:
                row = EmailTemplate(workspace_id=workspace_id, key=payload.key)
                self.db.add(row)
                by_key[payload.key] = row
            row.name = payload.name
            row.subject = payload.subject
            row.body_html = payload.body_html
            row.body_text = payload.body_text
        self.db.commit()
        return list(by_key.values())

    def _dns_for_workspace(self, workspace_id: uuid.UUID):
        config = self.db.scalar(
            select(WorkspaceDnsProvider).where(WorkspaceDnsProvider.workspace_id == workspace_id)
        )
        if not config or not config.enabled:
            return get_dns_provider("mock")
        return get_dns_provider(config.provider, api_token=config.api_token, zone_id=config.zone_id)

    def list_domains(self, workspace_id: uuid.UUID, user: User) -> list[WorkspaceDomain]:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        return list(
            self.db.scalars(select(WorkspaceDomain).where(WorkspaceDomain.workspace_id == workspace_id)).all()
        )

    def create_domain(
        self, workspace_id: uuid.UUID, payload: WorkspaceDomainCreate, user: User
    ) -> WorkspaceDomain:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        domain = payload.domain.strip().lower()
        existing = self.db.scalar(
            select(WorkspaceDomain).where(
                WorkspaceDomain.workspace_id == workspace_id, WorkspaceDomain.domain == domain
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Domain already exists.")
        token = secrets.token_urlsafe(24)
        txt_name = f"_oneopen-challenge.{domain}"
        row = WorkspaceDomain(
            workspace_id=workspace_id,
            domain=domain,
            verification_token=token,
            txt_record_name=txt_name,
        )
        self.db.add(row)
        self.db.flush()
        provider = self._dns_for_workspace(workspace_id)
        provider.create_txt_record(domain, txt_name, token)
        self.db.commit()
        self.db.refresh(row)
        return row

    def update_domain(
        self, domain_id: uuid.UUID, payload: WorkspaceDomainUpdate, user: User
    ) -> WorkspaceDomain:
        row = self.db.get(WorkspaceDomain, domain_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
        self.access.require_workspace_roles(row.workspace_id, user, WORKSPACE_ADMIN_ROLES)
        if payload.domain is not None:
            row.domain = payload.domain.strip().lower()
            row.txt_record_name = f"_oneopen-challenge.{row.domain}"
            row.verified = False
            row.verified_at = None
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete_domain(self, domain_id: uuid.UUID, user: User) -> None:
        row = self.db.get(WorkspaceDomain, domain_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
        self.access.require_workspace_roles(row.workspace_id, user, WORKSPACE_ADMIN_ROLES)
        self.db.delete(row)
        self.db.commit()

    def verify_domain(self, domain_id: uuid.UUID, user: User) -> WorkspaceDomain:
        row = self.db.get(WorkspaceDomain, domain_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
        self.access.require_workspace_roles(row.workspace_id, user, WORKSPACE_ADMIN_ROLES)
        provider = self._dns_for_workspace(row.workspace_id)
        name = row.txt_record_name or f"_oneopen-challenge.{row.domain}"
        found = provider.has_txt_record(row.domain, name, row.verification_token)
        if not found and isinstance(provider, MockDnsProvider):
            found = provider.mark_verified_by_auto_create(row.domain, name, row.verification_token)
        if not found:
            # Mock/cloudflare fallback shared store may still hold the auto-created TXT.
            from app.services.dns_provider import _SHARED_MOCK

            found = _SHARED_MOCK.mark_verified_by_auto_create(row.domain, name, row.verification_token)
        if not found:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification TXT record not found.",
            )
        row.verified = True
        row.verified_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(row)
        return row

    def get_dns_provider_config(self, workspace_id: uuid.UUID, user: User) -> dict | None:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        config = self.db.scalar(
            select(WorkspaceDnsProvider).where(WorkspaceDnsProvider.workspace_id == workspace_id)
        )
        if not config:
            return None
        return {
            "id": config.id,
            "workspace_id": config.workspace_id,
            "provider": config.provider,
            "api_token_set": bool(config.api_token),
            "zone_id": config.zone_id,
            "enabled": config.enabled,
            "config_json": config.config_json or {},
            "updated_at": config.updated_at,
        }

    def upsert_dns_provider(
        self, workspace_id: uuid.UUID, payload: WorkspaceDnsProviderUpsert, user: User
    ) -> dict:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        config = self.db.scalar(
            select(WorkspaceDnsProvider).where(WorkspaceDnsProvider.workspace_id == workspace_id)
        )
        if not config:
            config = WorkspaceDnsProvider(workspace_id=workspace_id)
            self.db.add(config)
        config.provider = payload.provider
        if payload.api_token is not None:
            config.api_token = payload.api_token
        config.zone_id = payload.zone_id
        config.enabled = payload.enabled
        config.config_json = payload.config_json
        self.db.commit()
        self.db.refresh(config)
        return {
            "id": config.id,
            "workspace_id": config.workspace_id,
            "provider": config.provider,
            "api_token_set": bool(config.api_token),
            "zone_id": config.zone_id,
            "enabled": config.enabled,
            "config_json": config.config_json or {},
            "updated_at": config.updated_at,
        }

    def _scheme_query(self, scheme_id: uuid.UUID) -> IssueTypeScheme:
        statement = (
            select(IssueTypeScheme)
            .options(selectinload(IssueTypeScheme.items))
            .where(IssueTypeScheme.id == scheme_id)
        )
        scheme = self.db.scalar(statement)
        if not scheme:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue type scheme not found.")
        return scheme

    def list_issue_type_schemes(self, workspace_id: uuid.UUID, user: User) -> list[IssueTypeScheme]:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(IssueTypeScheme)
            .options(selectinload(IssueTypeScheme.items))
            .where(IssueTypeScheme.workspace_id == workspace_id)
            .order_by(IssueTypeScheme.name.asc())
        )
        return list(self.db.scalars(statement).all())

    def create_issue_type_scheme(
        self, workspace_id: uuid.UUID, payload: IssueTypeSchemeCreate, user: User
    ) -> IssueTypeScheme:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        scheme = IssueTypeScheme(
            workspace_id=workspace_id, name=payload.name, description=payload.description
        )
        self.db.add(scheme)
        self.db.flush()
        for index, work_item_type in enumerate(payload.work_item_types):
            self.db.add(
                IssueTypeSchemeItem(
                    scheme_id=scheme.id, work_item_type=work_item_type, position=index
                )
            )
        self.db.commit()
        return self._scheme_query(scheme.id)

    def update_issue_type_scheme(
        self, scheme_id: uuid.UUID, payload: IssueTypeSchemeUpdate, user: User
    ) -> IssueTypeScheme:
        scheme = self._scheme_query(scheme_id)
        self.access.require_workspace_roles(scheme.workspace_id, user, WORKSPACE_ADMIN_ROLES)
        values = payload.model_dump(exclude_unset=True, exclude={"work_item_types"})
        for key, value in values.items():
            setattr(scheme, key, value)
        if payload.work_item_types is not None:
            for item in list(scheme.items):
                self.db.delete(item)
            self.db.flush()
            for index, work_item_type in enumerate(payload.work_item_types):
                self.db.add(
                    IssueTypeSchemeItem(
                        scheme_id=scheme.id, work_item_type=work_item_type, position=index
                    )
                )
        self.db.commit()
        return self._scheme_query(scheme.id)

    def delete_issue_type_scheme(self, scheme_id: uuid.UUID, user: User) -> None:
        scheme = self._scheme_query(scheme_id)
        self.access.require_workspace_roles(scheme.workspace_id, user, WORKSPACE_ADMIN_ROLES)
        projects = self.db.scalars(
            select(Project).where(Project.issue_type_scheme_id == scheme_id)
        ).all()
        for project in projects:
            project.issue_type_scheme_id = None
        self.db.delete(scheme)
        self.db.commit()

    def assign_issue_type_scheme(
        self, project_id: uuid.UUID, scheme_id: uuid.UUID | None, user: User
    ) -> Project:
        context = self.access.require_project_manage(project_id, user)
        project = context.project
        if scheme_id is not None:
            scheme = self.db.get(IssueTypeScheme, scheme_id)
            if not scheme or scheme.workspace_id != project.workspace_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Issue type scheme must belong to the same workspace.",
                )
        project.issue_type_scheme_id = scheme_id
        self.db.commit()
        self.db.refresh(project)
        return project
