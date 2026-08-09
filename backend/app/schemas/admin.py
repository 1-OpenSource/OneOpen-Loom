import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class WorkspaceSmtpSettingsUpsert(BaseModel):
    host: str | None = Field(default=None, max_length=255)
    port: int = Field(default=587, ge=1, le=65535)
    username: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, max_length=255)
    use_tls: bool = True
    from_email: EmailStr | None = None
    from_name: str | None = Field(default=None, max_length=160)
    enabled: bool = False


class WorkspaceSmtpSettingsRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    host: str | None
    port: int
    username: str | None
    password_set: bool = False
    use_tls: bool
    from_email: str | None
    from_name: str | None
    enabled: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SmtpTestRequest(BaseModel):
    to_email: EmailStr


class EmailTemplateUpsert(BaseModel):
    key: str = Field(min_length=1, max_length=60)
    name: str = Field(min_length=1, max_length=160)
    subject: str = Field(min_length=1, max_length=255)
    body_html: str = ""
    body_text: str = ""


class EmailTemplateRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    key: str
    name: str
    subject: str
    body_html: str
    body_text: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceDomainCreate(BaseModel):
    domain: str = Field(min_length=1, max_length=255)


class WorkspaceDomainUpdate(BaseModel):
    domain: str | None = Field(default=None, min_length=1, max_length=255)


class WorkspaceDomainRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    domain: str
    verified: bool
    verification_token: str
    txt_record_name: str | None
    created_at: datetime
    verified_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class WorkspaceDnsProviderUpsert(BaseModel):
    provider: str = Field(default="mock", max_length=40)
    api_token: str | None = Field(default=None, max_length=500)
    zone_id: str | None = Field(default=None, max_length=120)
    enabled: bool = True
    config_json: dict = Field(default_factory=dict)


class WorkspaceDnsProviderRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    provider: str
    api_token_set: bool = False
    zone_id: str | None
    enabled: bool
    config_json: dict
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IssueTypeSchemeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    work_item_types: list[str] = Field(default_factory=list)


class IssueTypeSchemeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    work_item_types: list[str] | None = None


class IssueTypeSchemeItemRead(BaseModel):
    id: uuid.UUID
    scheme_id: uuid.UUID
    work_item_type: str
    position: int

    model_config = ConfigDict(from_attributes=True)


class IssueTypeSchemeRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    items: list[IssueTypeSchemeItemRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProjectIssueTypeSchemeAssign(BaseModel):
    issue_type_scheme_id: uuid.UUID | None = None


class MarketplaceCatalogItem(BaseModel):
    id: str
    name: str
    description: str
    version: str = "1.0.0"
    manifest: dict = Field(default_factory=dict)


class MarketplaceInstallRequest(BaseModel):
    catalog_id: str = Field(min_length=1, max_length=80)
