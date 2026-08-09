import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.space import SpaceMemberRole, SpacePageStatus


class SpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    key: str | None = Field(default=None, min_length=1, max_length=40)
    description: str | None = None


class SpaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    key: str | None = Field(default=None, min_length=1, max_length=40)
    description: str | None = None


class SpaceRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    key: str
    name: str
    description: str | None
    created_by_user_id: uuid.UUID
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SpacePageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    slug: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = None
    parent_page_id: uuid.UUID | None = None
    position: int = 0
    status: SpacePageStatus = SpacePageStatus.PUBLISHED
    icon: str | None = Field(default=None, max_length=40)
    owner_user_id: uuid.UUID | None = None
    template_key: str | None = Field(default=None, max_length=80)
    labels: list[str] = Field(default_factory=list)


class SpacePageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    slug: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = None
    parent_page_id: uuid.UUID | None = None
    position: int | None = None
    status: SpacePageStatus | None = None
    icon: str | None = Field(default=None, max_length=40)
    owner_user_id: uuid.UUID | None = None
    template_key: str | None = Field(default=None, max_length=80)
    labels: list[str] | None = None


class SpacePageRead(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    parent_page_id: uuid.UUID | None
    title: str
    slug: str
    content: str | None
    status: SpacePageStatus
    icon: str | None
    owner_user_id: uuid.UUID | None
    template_key: str | None
    labels: list[str] = Field(default_factory=list, validation_alias="labels_json")
    position: int
    archived_at: datetime | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SpacePageTreeNode(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    position: int
    children: list["SpacePageTreeNode"] = Field(default_factory=list)


class SpacePageVersionRead(BaseModel):
    id: uuid.UUID
    page_id: uuid.UUID
    content: str | None
    edited_by_user_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkItemPageLink(BaseModel):
    page_id: uuid.UUID


class PageWorkItemSummary(BaseModel):
    id: uuid.UUID
    work_item_key: str
    title: str
    status: str
    type: str
    project_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class SpacePageCommentCreate(BaseModel):
    body: str = Field(min_length=1)


class SpacePageCommentRead(BaseModel):
    id: uuid.UUID
    page_id: uuid.UUID
    user_id: uuid.UUID
    body: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SpaceMemberEntry(BaseModel):
    user_id: uuid.UUID
    role: SpaceMemberRole


class SpaceMembersUpdate(BaseModel):
    members: list[SpaceMemberEntry]


class SpaceMemberRead(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    user_id: uuid.UUID
    role: SpaceMemberRole

    model_config = ConfigDict(from_attributes=True)


class MagicboardSearchResult(BaseModel):
    page_id: uuid.UUID
    space_id: uuid.UUID
    space_key: str
    title: str
    slug: str
    snippet: str | None = None


class MagicboardTemplateRead(BaseModel):
    key: str
    title: str
    description: str
    default_content: str


class SpacePageFromTemplateCreate(BaseModel):
    template_key: str = Field(min_length=1, max_length=80)
    title: str | None = Field(default=None, min_length=1, max_length=240)
    parent_page_id: uuid.UUID | None = None
    position: int = 0


class MarkdownPageExport(BaseModel):
    path: str
    content: str


class SpaceExportRead(BaseModel):
    space_key: str
    space_name: str
    pages: list[MarkdownPageExport]


class MarkdownPageImport(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    content: str | None = None
    parent_path: str | None = None


class SpaceImportRequest(BaseModel):
    pages: list[MarkdownPageImport]


class SpacePageAttachmentRead(BaseModel):
    id: uuid.UUID
    page_id: uuid.UUID
    filename: str
    content_type: str | None
    size_bytes: int
    storage_path: str
    uploaded_by_user_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SpacePageRecentRead(BaseModel):
    page_id: uuid.UUID
    space_id: uuid.UUID
    title: str
    slug: str
    viewed_at: datetime


class SpacePageFavoriteRead(BaseModel):
    page_id: uuid.UUID
    space_id: uuid.UUID
    title: str
    slug: str


class SpacePageShareLinkRead(BaseModel):
    id: uuid.UUID
    page_id: uuid.UUID
    token: str
    created_by_user_id: uuid.UUID
    revoked_at: datetime | None
    created_at: datetime
    share_path: str

    model_config = ConfigDict(from_attributes=True)


class SpacePagePathResolve(BaseModel):
    space_id: uuid.UUID
    space_key: str
    page_id: uuid.UUID
    page_slug: str
    title: str
