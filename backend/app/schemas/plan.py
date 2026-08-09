import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PlanCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    oql: str | None = None
    project_ids: list[uuid.UUID] = Field(default_factory=list)


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    oql: str | None = None
    project_ids: list[uuid.UUID] | None = None


class PlanRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: str | None
    oql: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    project_ids: list[uuid.UUID] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class RoadmapItem(BaseModel):
    id: uuid.UUID
    work_item_key: str
    title: str
    type: str
    status: str
    start_date: date | None
    due_date: date | None
    epic_id: uuid.UUID | None = None
    children: list["RoadmapItem"] = Field(default_factory=list)


class RoadmapRead(BaseModel):
    items: list[RoadmapItem]
