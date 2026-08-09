import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.automation import AutomationTriggerType


class AutomationRuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    trigger_type: AutomationTriggerType
    conditions: dict | None = None
    actions: list[dict] = Field(default_factory=list)
    is_enabled: bool = True


class AutomationRuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    trigger_type: AutomationTriggerType | None = None
    conditions: dict | None = None
    actions: list[dict] | None = None
    is_enabled: bool | None = None


class AutomationRuleRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    trigger_type: AutomationTriggerType
    conditions: dict | None
    actions: list[dict]
    is_enabled: bool
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AutomationRunRead(BaseModel):
    id: uuid.UUID
    rule_id: uuid.UUID
    work_item_id: uuid.UUID | None
    status: str
    result_json: dict | None
    ran_at: datetime

    model_config = ConfigDict(from_attributes=True)
