import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.workspace import WorkspaceRole, WorkspaceVisibility
from app.schemas.user import UserSummary


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    slug: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = None
    visibility: WorkspaceVisibility = WorkspaceVisibility.PRIVATE


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    logo_url: str | None = None
    accent_color: str | None = Field(default=None, max_length=20)
    brand_name: str | None = Field(default=None, max_length=160)
    brand_tagline: str | None = Field(default=None, max_length=255)
    visibility: WorkspaceVisibility | None = None


class WorkspaceRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    accent_color: str
    brand_name: str | None
    brand_tagline: str | None
    visibility: WorkspaceVisibility
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class WorkspaceMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: WorkspaceRole = WorkspaceRole.MEMBER


class WorkspaceMemberRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    role: WorkspaceRole
    user: UserSummary | None = None

    model_config = ConfigDict(from_attributes=True)
