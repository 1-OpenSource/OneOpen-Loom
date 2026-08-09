import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None


class WorkspaceGroupRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    member_ids: list[uuid.UUID] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class WorkspaceGroupMemberAdd(BaseModel):
    user_id: uuid.UUID


class PermissionSchemeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)


class PermissionGrantCreate(BaseModel):
    permission: str = Field(min_length=1, max_length=80)
    holder_type: str = "WORKSPACE_ROLE"
    holder_id: uuid.UUID | None = None
    holder_role: str | None = None


class PermissionGrantRead(BaseModel):
    id: uuid.UUID
    scheme_id: uuid.UUID
    permission: str
    holder_type: str
    holder_id: uuid.UUID | None
    holder_role: str | None

    model_config = ConfigDict(from_attributes=True)


class PermissionSchemeRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    created_at: datetime
    grants: list[PermissionGrantRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class IssueSecurityLevelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None


class IssueSecurityLevelRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None

    model_config = ConfigDict(from_attributes=True)


class ApiTokenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    expires_at: datetime | None = None


class ApiTokenRead(BaseModel):
    id: uuid.UUID
    name: str
    token_prefix: str
    created_at: datetime
    last_used_at: datetime | None
    expires_at: datetime | None
    revoked_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ApiTokenCreated(BaseModel):
    token: ApiTokenRead
    secret: str


class SsoConfigUpsert(BaseModel):
    provider: str = "oidc"
    client_id: str | None = None
    client_secret: str | None = None
    issuer: str | None = None
    idp_entity_id: str | None = None
    idp_sso_url: str | None = None
    idp_x509_cert: str | None = None
    sp_entity_id: str | None = None
    enabled: bool = False


class SsoConfigRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    provider: str
    client_id: str | None
    issuer: str | None
    idp_entity_id: str | None = None
    idp_sso_url: str | None = None
    idp_x509_cert: str | None = None
    sp_entity_id: str | None = None
    enabled: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SsoValidateRequest(BaseModel):
    code: str | None = None
    id_token: str | None = None


class RetentionPolicyCreate(BaseModel):
    resource_type: str = Field(min_length=1, max_length=60)
    retain_days: int = Field(default=365, ge=1)


class RetentionPolicyRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    resource_type: str
    retain_days: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
