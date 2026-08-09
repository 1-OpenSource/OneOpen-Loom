import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.sprint import SprintState


class SprintCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    goal: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class SprintUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    goal: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class SprintRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    goal: str | None
    start_date: date | None
    end_date: date | None
    state: SprintState
    complete_date: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SprintItemAdd(BaseModel):
    work_item_id: uuid.UUID
    committed_points: int | None = Field(default=None, ge=0)


class SprintItemRead(BaseModel):
    id: uuid.UUID
    sprint_id: uuid.UUID
    work_item_id: uuid.UUID
    committed_points: int | None

    model_config = ConfigDict(from_attributes=True)


class SprintMetricRead(BaseModel):
    id: uuid.UUID
    sprint_id: uuid.UUID
    committed_points: int
    completed_points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SprintCompleteRequest(BaseModel):
    incomplete_action: str = Field(default="backlog", pattern="^(backlog|next_sprint)$")
    next_sprint_id: uuid.UUID | None = None
