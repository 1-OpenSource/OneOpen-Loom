import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.notification import NotificationType


class NotificationRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: NotificationType
    title: str
    body: str | None
    work_item_id: uuid.UUID | None
    project_id: uuid.UUID | None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: bool | None = None
    in_app_enabled: bool | None = None
    preferences_json: dict | None = None


class NotificationPreferenceRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email_enabled: bool
    in_app_enabled: bool
    preferences_json: dict | None

    model_config = ConfigDict(from_attributes=True)


class WebhookEndpointCreate(BaseModel):
    project_id: uuid.UUID | None = None
    url: str = Field(min_length=1, max_length=500)
    secret: str | None = Field(default=None, max_length=120)
    events: list[str] = Field(default_factory=list)
    is_active: bool = True


class WebhookEndpointUpdate(BaseModel):
    url: str | None = Field(default=None, min_length=1, max_length=500)
    secret: str | None = Field(default=None, max_length=120)
    events: list[str] | None = None
    is_active: bool | None = None


class WebhookEndpointRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    project_id: uuid.UUID | None
    url: str
    events: list[str]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WebhookDeliveryRead(BaseModel):
    id: uuid.UUID
    webhook_id: uuid.UUID
    event: str
    response_status: int | None
    delivered_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
