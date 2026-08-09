import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None


class SpaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None


class SpaceRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SpacePageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    content: str | None = None
    parent_page_id: uuid.UUID | None = None
    position: int = 0


class SpacePageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    content: str | None = None
    parent_page_id: uuid.UUID | None = None
    position: int | None = None


class SpacePageRead(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    parent_page_id: uuid.UUID | None
    title: str
    content: str | None
    position: int
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SpacePageTreeNode(BaseModel):
    id: uuid.UUID
    title: str
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
