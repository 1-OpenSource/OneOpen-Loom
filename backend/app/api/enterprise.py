import uuid

from fastapi import APIRouter, Depends, Form, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.enterprise import (
    ApiTokenCreate,
    ApiTokenCreated,
    ApiTokenRead,
    IssueSecurityLevelCreate,
    IssueSecurityLevelRead,
    PermissionGrantCreate,
    PermissionGrantRead,
    PermissionSchemeCreate,
    PermissionSchemeRead,
    RetentionPolicyCreate,
    RetentionPolicyRead,
    SsoConfigRead,
    SsoConfigUpsert,
    SsoValidateRequest,
    WorkspaceGroupCreate,
    WorkspaceGroupMemberAdd,
    WorkspaceGroupRead,
)
from app.services.enterprise_service import EnterpriseService

router = APIRouter(tags=["enterprise"])


def _group_to_read(group) -> WorkspaceGroupRead:
    return WorkspaceGroupRead(
        id=group.id,
        workspace_id=group.workspace_id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        member_ids=[m.user_id for m in group.members],
    )


@router.post(
    "/workspaces/{workspace_id}/groups", response_model=WorkspaceGroupRead, status_code=status.HTTP_201_CREATED
)
def create_group(
    workspace_id: uuid.UUID,
    payload: WorkspaceGroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = EnterpriseService(db).create_group(workspace_id, payload, current_user)
    return _group_to_read(group)


@router.get("/workspaces/{workspace_id}/groups", response_model=list[WorkspaceGroupRead])
def list_groups(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    groups = EnterpriseService(db).list_groups(workspace_id, current_user)
    return [_group_to_read(g) for g in groups]


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    EnterpriseService(db).delete_group(group_id, current_user)


@router.post("/groups/{group_id}/members", status_code=status.HTTP_204_NO_CONTENT)
def add_group_member(
    group_id: uuid.UUID,
    payload: WorkspaceGroupMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    EnterpriseService(db).add_group_member(group_id, payload.user_id, current_user)


@router.delete("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_group_member(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    EnterpriseService(db).remove_group_member(group_id, user_id, current_user)


@router.post(
    "/projects/{project_id}/permission-scheme",
    response_model=PermissionSchemeRead,
    status_code=status.HTTP_201_CREATED,
)
def create_permission_scheme(
    project_id: uuid.UUID,
    payload: PermissionSchemeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).create_scheme(project_id, payload, current_user)


@router.get("/projects/{project_id}/permission-scheme", response_model=PermissionSchemeRead)
def get_permission_scheme(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).get_or_create_scheme(project_id, current_user)


@router.post(
    "/projects/{project_id}/permission-scheme/grants",
    response_model=PermissionGrantRead,
    status_code=status.HTTP_201_CREATED,
)
def add_permission_grant(
    project_id: uuid.UUID,
    payload: PermissionGrantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).add_grant(project_id, payload, current_user)


@router.delete(
    "/projects/{project_id}/permission-scheme/grants/{grant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_permission_grant(
    project_id: uuid.UUID,
    grant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    EnterpriseService(db).delete_grant(project_id, grant_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/projects/{project_id}/security-levels",
    response_model=IssueSecurityLevelRead,
    status_code=status.HTTP_201_CREATED,
)
def create_security_level(
    project_id: uuid.UUID,
    payload: IssueSecurityLevelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).create_security_level(project_id, payload, current_user)


@router.get("/projects/{project_id}/security-levels", response_model=list[IssueSecurityLevelRead])
def list_security_levels(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).list_security_levels(project_id, current_user)


@router.post("/api-tokens", response_model=ApiTokenCreated, status_code=status.HTTP_201_CREATED)
def create_api_token(
    payload: ApiTokenCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token, secret = EnterpriseService(db).create_api_token(payload, current_user)
    return ApiTokenCreated(token=ApiTokenRead.model_validate(token), secret=secret)


@router.get("/api-tokens", response_model=list[ApiTokenRead])
def list_api_tokens(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).list_api_tokens(current_user)


@router.delete("/api-tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_token(
    token_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    EnterpriseService(db).revoke_api_token(token_id, current_user)


@router.get("/workspaces/{workspace_id}/sso-config", response_model=SsoConfigRead | None)
def get_sso_config(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).get_sso_config(workspace_id, current_user)


@router.put("/workspaces/{workspace_id}/sso-config", response_model=SsoConfigRead)
def upsert_sso_config(
    workspace_id: uuid.UUID,
    payload: SsoConfigUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).upsert_sso_config(workspace_id, payload, current_user)


@router.post("/workspaces/{workspace_id}/sso-config/validate")
def validate_sso_config(
    workspace_id: uuid.UUID,
    payload: SsoValidateRequest,
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).validate_sso(workspace_id)


@router.get("/workspaces/{workspace_id}/sso/saml/metadata")
def saml_metadata(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    xml = EnterpriseService(db).saml_metadata_xml(workspace_id)
    return Response(content=xml, media_type="application/samlmetadata+xml")


@router.post("/workspaces/{workspace_id}/sso/saml/acs")
async def saml_acs(
    workspace_id: uuid.UUID,
    email: str | None = Form(default=None),
    SAMLResponse: str | None = Form(default=None),
    assertion: str | None = Form(default=None),
    db: Session = Depends(get_db),
):
    form_data: dict[str, str] = {}
    if email:
        form_data["email"] = email
    if SAMLResponse:
        form_data["SAMLResponse"] = SAMLResponse
    if assertion:
        form_data["assertion"] = assertion
    return EnterpriseService(db).saml_acs(workspace_id, form_data)


@router.post(
    "/workspaces/{workspace_id}/retention-policies",
    response_model=RetentionPolicyRead,
    status_code=status.HTTP_201_CREATED,
)
def create_retention_policy(
    workspace_id: uuid.UUID,
    payload: RetentionPolicyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).create_retention_policy(workspace_id, payload, current_user)


@router.get("/workspaces/{workspace_id}/retention-policies", response_model=list[RetentionPolicyRead])
def list_retention_policies(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).list_retention_policies(workspace_id, current_user)


@router.get("/me/gdpr-export")
def gdpr_export(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EnterpriseService(db).export_user_data(current_user)
