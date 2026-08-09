import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DashboardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    is_shared: bool = False


class DashboardUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    is_shared: bool | None = None


class DashboardGadgetCreate(BaseModel):
    gadget_type: str = Field(min_length=1, max_length=80)
    config_json: dict = Field(default_factory=dict)
    position: int = 0


class DashboardGadgetRead(BaseModel):
    id: uuid.UUID
    dashboard_id: uuid.UUID
    gadget_type: str
    config_json: dict
    position: int

    model_config = ConfigDict(from_attributes=True)


class DashboardRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    owner_user_id: uuid.UUID
    is_shared: bool
    created_at: datetime
    updated_at: datetime
    gadgets: list[DashboardGadgetRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProjectTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    config_json: dict = Field(default_factory=dict)


class ProjectTemplateRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID | None
    name: str
    config_json: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IssueTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    work_item_type: str = Field(default="TASK", max_length=40)
    fields_json: dict = Field(default_factory=dict)


class IssueTemplateRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    work_item_type: str
    fields_json: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IntakeFormCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    fields_json: dict = Field(default_factory=dict)
    default_work_item_type: str = Field(default="TASK", max_length=40)


class IntakeFormUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    fields_json: dict | None = None
    default_work_item_type: str | None = Field(default=None, max_length=40)
    is_active: bool | None = None


class IntakeFormRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    token: str
    fields_json: dict
    default_work_item_type: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IntakeSubmission(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    description: str | None = None
    reporter_email: str | None = None
