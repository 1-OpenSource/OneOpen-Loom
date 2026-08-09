import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkflowStatusCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    key: str = Field(min_length=1, max_length=40)
    color: str = Field(default="#94a3b8", max_length=20)
    category: str = Field(default="in_progress", max_length=40)
    position: int | None = None


class WorkflowStatusUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = Field(default=None, max_length=20)
    category: str | None = Field(default=None, max_length=40)
    position: int | None = None


class WorkflowTransitionCreate(BaseModel):
    from_status_id: uuid.UUID
    to_status_id: uuid.UUID
    name: str | None = Field(default=None, max_length=120)


class WorkflowTransitionRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    from_status_id: uuid.UUID
    to_status_id: uuid.UUID
    name: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkflowTransitionRuleCreate(BaseModel):
    kind: str = Field(default="CONDITION", pattern=r"^(CONDITION|VALIDATOR|POST_FUNCTION)$")
    rule_type: str = Field(min_length=1, max_length=80)
    config: dict = Field(default_factory=dict)
    position: int | None = None


class WorkflowTransitionRuleUpdate(BaseModel):
    kind: str | None = Field(default=None, pattern=r"^(CONDITION|VALIDATOR|POST_FUNCTION)$")
    rule_type: str | None = Field(default=None, min_length=1, max_length=80)
    config: dict | None = None
    position: int | None = None


class WorkflowTransitionRuleRead(BaseModel):
    id: uuid.UUID
    transition_id: uuid.UUID
    kind: str
    rule_type: str
    config: dict
    position: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BoardColumnCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    position: int | None = None
    wip_limit: int | None = Field(default=None, ge=0)
    status_ids: list[uuid.UUID] = Field(default_factory=list)


class BoardColumnUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    position: int | None = None
    wip_limit: int | None = Field(default=None, ge=0)
    status_ids: list[uuid.UUID] | None = None


class BoardColumnRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    position: int
    wip_limit: int | None
    status_ids: list[uuid.UUID] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
