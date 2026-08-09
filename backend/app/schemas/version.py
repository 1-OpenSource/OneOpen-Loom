import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectVersionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    start_date: date | None = None
    release_date: date | None = None


class ProjectVersionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    start_date: date | None = None
    release_date: date | None = None
    released: bool | None = None
    archived: bool | None = None


class ProjectVersionRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None
    start_date: date | None
    release_date: date | None
    released: bool
    archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkItemVersionLink(BaseModel):
    version_id: uuid.UUID


class WorkLogCreate(BaseModel):
    time_spent_seconds: int = Field(gt=0)
    description: str | None = None
    logged_at: date | None = None


class WorkLogRead(BaseModel):
    id: uuid.UUID
    work_item_id: uuid.UUID
    user_id: uuid.UUID
    time_spent_seconds: int
    description: str | None
    logged_at: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
