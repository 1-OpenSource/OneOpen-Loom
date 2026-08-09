import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SavedFilterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    oql: str = Field(min_length=1)
    project_id: uuid.UUID | None = None
    is_shared: bool = False


class SavedFilterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    oql: str | None = Field(default=None, min_length=1)
    is_shared: bool | None = None


class SavedFilterRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    project_id: uuid.UUID | None
    owner_user_id: uuid.UUID
    name: str
    oql: str
    is_shared: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OqlSearchRequest(BaseModel):
    oql: str = Field(min_length=1)
    project_id: uuid.UUID | None = None
    workspace_id: uuid.UUID | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class BulkWorkItemRequest(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1)
    action: str = Field(pattern="^(update_status|update_priority|update_assignee|add_label|archive|delete)$")
    payload: dict = Field(default_factory=dict)
