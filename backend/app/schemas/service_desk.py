import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RequestTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    work_item_type: str = Field(default="TASK", max_length=40)
    icon: str | None = Field(default=None, max_length=80)
    fields_json: dict | None = None


class RequestTypeRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None
    work_item_type: str
    icon: str | None
    fields_json: dict | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QueueCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    oql: str | None = None
    position: int = 0


class QueueRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    oql: str | None
    position: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SlaCalendarCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    timezone: str = Field(default="UTC", max_length=80)
    working_hours_json: dict | None = None


class SlaCalendarRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    timezone: str
    working_hours_json: dict | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SlaGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    calendar_id: uuid.UUID | None = None
    oql: str | None = None
    goal_seconds: int = Field(gt=0)


class SlaGoalRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    calendar_id: uuid.UUID | None
    oql: str | None
    goal_seconds: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SlaClockRead(BaseModel):
    id: uuid.UUID
    work_item_id: uuid.UUID
    goal_id: uuid.UUID
    started_at: datetime
    paused_at: datetime | None
    completed_at: datetime | None
    breached: bool
    remaining_seconds: int | None

    model_config = ConfigDict(from_attributes=True)


class ApprovalCreate(BaseModel):
    approver_user_id: uuid.UUID


class ApprovalDecision(BaseModel):
    status: str = Field(pattern="^(APPROVED|REJECTED)$")
    comment: str | None = None


class ApprovalRead(BaseModel):
    id: uuid.UUID
    work_item_id: uuid.UUID
    approver_user_id: uuid.UUID
    status: str
    decided_at: datetime | None
    comment: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CsatSubmit(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class CsatRead(BaseModel):
    id: uuid.UUID
    work_item_id: uuid.UUID
    rating: int
    comment: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
