import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DevLinkCreate(BaseModel):
    provider: str = Field(default="github", max_length=30)
    link_type: str = Field(default="pr", max_length=20)
    url: str = Field(min_length=1, max_length=1000)
    title: str | None = None
    status: str | None = None


class DevLinkRead(BaseModel):
    id: uuid.UUID
    work_item_id: uuid.UUID
    provider: str
    link_type: str
    url: str
    title: str | None
    status: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SlackConfigUpsert(BaseModel):
    webhook_url: str | None = None
    default_channel: str | None = None
    enabled: bool = False


class SlackConfigRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    webhook_url: str | None
    default_channel: str | None
    enabled: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PluginInstallCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    manifest_json: dict = Field(default_factory=dict)


class PluginInstallUpdate(BaseModel):
    enabled: bool | None = None
    manifest_json: dict | None = None


class PluginInstallRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    manifest_json: dict
    enabled: bool
    installed_at: datetime

    model_config = ConfigDict(from_attributes=True)
