import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.admin import (
    EmailTemplateRead,
    EmailTemplateUpsert,
    IssueTypeSchemeCreate,
    IssueTypeSchemeRead,
    IssueTypeSchemeUpdate,
    MarketplaceCatalogItem,
    MarketplaceInstallRequest,
    ProjectIssueTypeSchemeAssign,
    SmtpTestRequest,
    WorkspaceDnsProviderRead,
    WorkspaceDnsProviderUpsert,
    WorkspaceDomainCreate,
    WorkspaceDomainRead,
    WorkspaceDomainUpdate,
    WorkspaceSmtpSettingsRead,
    WorkspaceSmtpSettingsUpsert,
)
from app.schemas.integration import PluginInstallRead
from app.schemas.project import ProjectRead
from app.services.admin_service import AdminService
from app.services.integration_service import IntegrationService

router = APIRouter(tags=["admin"])


@router.get("/workspaces/{workspace_id}/smtp", response_model=WorkspaceSmtpSettingsRead | None)
def get_smtp_settings(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).get_smtp_settings(workspace_id, current_user)


@router.put("/workspaces/{workspace_id}/smtp", response_model=WorkspaceSmtpSettingsRead)
def upsert_smtp_settings(
    workspace_id: uuid.UUID,
    payload: WorkspaceSmtpSettingsUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).upsert_smtp_settings(workspace_id, payload, current_user)


@router.post("/workspaces/{workspace_id}/smtp/test")
def test_smtp_settings(
    workspace_id: uuid.UUID,
    payload: SmtpTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).test_smtp(workspace_id, payload, current_user)


@router.get("/workspaces/{workspace_id}/email-templates", response_model=list[EmailTemplateRead])
def list_email_templates(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).list_email_templates(workspace_id, current_user)


@router.put("/workspaces/{workspace_id}/email-templates", response_model=list[EmailTemplateRead])
def upsert_email_templates(
    workspace_id: uuid.UUID,
    payload: list[EmailTemplateUpsert],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).upsert_email_templates(workspace_id, payload, current_user)


@router.get("/workspaces/{workspace_id}/domains", response_model=list[WorkspaceDomainRead])
def list_domains(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).list_domains(workspace_id, current_user)


@router.post(
    "/workspaces/{workspace_id}/domains",
    response_model=WorkspaceDomainRead,
    status_code=status.HTTP_201_CREATED,
)
def create_domain(
    workspace_id: uuid.UUID,
    payload: WorkspaceDomainCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).create_domain(workspace_id, payload, current_user)


@router.put("/domains/{domain_id}", response_model=WorkspaceDomainRead)
def update_domain(
    domain_id: uuid.UUID,
    payload: WorkspaceDomainUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).update_domain(domain_id, payload, current_user)


@router.delete("/domains/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_domain(
    domain_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    AdminService(db).delete_domain(domain_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/domains/{domain_id}/verify", response_model=WorkspaceDomainRead)
def verify_domain(
    domain_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).verify_domain(domain_id, current_user)


@router.get("/workspaces/{workspace_id}/dns-provider", response_model=WorkspaceDnsProviderRead | None)
def get_dns_provider(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).get_dns_provider_config(workspace_id, current_user)


@router.put("/workspaces/{workspace_id}/dns-provider", response_model=WorkspaceDnsProviderRead)
def upsert_dns_provider(
    workspace_id: uuid.UUID,
    payload: WorkspaceDnsProviderUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).upsert_dns_provider(workspace_id, payload, current_user)


@router.get(
    "/workspaces/{workspace_id}/issue-type-schemes", response_model=list[IssueTypeSchemeRead]
)
def list_issue_type_schemes(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).list_issue_type_schemes(workspace_id, current_user)


@router.post(
    "/workspaces/{workspace_id}/issue-type-schemes",
    response_model=IssueTypeSchemeRead,
    status_code=status.HTTP_201_CREATED,
)
def create_issue_type_scheme(
    workspace_id: uuid.UUID,
    payload: IssueTypeSchemeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).create_issue_type_scheme(workspace_id, payload, current_user)


@router.put("/issue-type-schemes/{scheme_id}", response_model=IssueTypeSchemeRead)
def update_issue_type_scheme(
    scheme_id: uuid.UUID,
    payload: IssueTypeSchemeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).update_issue_type_scheme(scheme_id, payload, current_user)


@router.delete("/issue-type-schemes/{scheme_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue_type_scheme(
    scheme_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    AdminService(db).delete_issue_type_scheme(scheme_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/projects/{project_id}/issue-type-scheme", response_model=ProjectRead)
def assign_issue_type_scheme(
    project_id: uuid.UUID,
    payload: ProjectIssueTypeSchemeAssign,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AdminService(db).assign_issue_type_scheme(
        project_id, payload.issue_type_scheme_id, current_user
    )


@router.get(
    "/workspaces/{workspace_id}/marketplace/catalog", response_model=list[MarketplaceCatalogItem]
)
def marketplace_catalog(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IntegrationService(db).marketplace_catalog(workspace_id, current_user)


@router.post(
    "/workspaces/{workspace_id}/marketplace/install",
    response_model=PluginInstallRead,
    status_code=status.HTTP_201_CREATED,
)
def marketplace_install(
    workspace_id: uuid.UUID,
    payload: MarketplaceInstallRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IntegrationService(db).install_from_catalog(workspace_id, payload.catalog_id, current_user)
