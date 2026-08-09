import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.fields import CustomFieldType


class ProjectLabelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str | None = Field(default=None, max_length=20)


class ProjectLabelRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    color: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectComponentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = None


class ProjectComponentRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomFieldDefinitionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    field_type: CustomFieldType = CustomFieldType.TEXT
    options: list[str] | None = None
    applies_to_types: list[str] | None = None
    is_required: bool = False


class CustomFieldDefinitionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    field_type: CustomFieldType | None = None
    options: list[str] | None = None
    applies_to_types: list[str] | None = None
    is_required: bool | None = None


class CustomFieldDefinitionRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    field_type: CustomFieldType
    options: list[str] | None
    applies_to_types: list[str] | None
    is_required: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomFieldValueSet(BaseModel):
    field_id: uuid.UUID
    value_text: str | None = None
    value_json: dict | list | None = None


class CustomFieldValueRead(BaseModel):
    id: uuid.UUID
    work_item_id: uuid.UUID
    field_id: uuid.UUID
    value_text: str | None
    value_json: dict | list | None

    model_config = ConfigDict(from_attributes=True)
