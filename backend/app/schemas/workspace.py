import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.workspace import (
    WorkspaceInvitationStatus,
    WorkspaceMemberStatus,
    WorkspaceRole,
    WorkspaceVisibility,
)
from app.schemas.user import UserSummary


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    slug: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=2000)
    logo_url: str | None = Field(default=None, max_length=500)
    accent_color: str = Field(default="#e86a17", max_length=20)
    brand_name: str | None = Field(default=None, max_length=160)
    brand_tagline: str | None = Field(default=None, max_length=255)
    visibility: WorkspaceVisibility = WorkspaceVisibility.PRIVATE


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    slug: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=2000)
    logo_url: str | None = Field(default=None, max_length=500)
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
    accent_color: str = "#e86a17"
    brand_name: str | None = None
    brand_tagline: str | None = None
    visibility: WorkspaceVisibility
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: WorkspaceRole = WorkspaceRole.MEMBER


class WorkspaceMemberRoleUpdate(BaseModel):
    role: WorkspaceRole


class WorkspaceMemberRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    role: WorkspaceRole
    status: WorkspaceMemberStatus
    created_at: datetime
    updated_at: datetime
    user: UserSummary

    model_config = ConfigDict(from_attributes=True)


class WorkspaceInvitationCreate(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.MEMBER


class WorkspaceInvitationRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    email: EmailStr
    role: WorkspaceRole
    token: str
    status: WorkspaceInvitationStatus
    invited_by_user_id: uuid.UUID
    invited_by: UserSummary
    created_at: datetime
    updated_at: datetime
    accepted_at: datetime | None
    revoked_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class WorkspaceInvitationAccept(BaseModel):
    token: str


class WorkspaceOverviewSummary(BaseModel):
    total_projects: int
    total_work_items: int
    total_members: int
    total_open_invitations: int
    recent_project_ids: list[uuid.UUID]
    recent_activity_count: int
    status_breakdown: dict[str, int]


class WorkspaceActivitySummary(BaseModel):
    recent_activity_count: int
