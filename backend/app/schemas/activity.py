import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.activity import AuditEntityType
from app.schemas.user import UserSummary


class ActivityRead(BaseModel):
    id: uuid.UUID
    work_item_id: uuid.UUID | None
    project_id: uuid.UUID | None
    workspace_id: uuid.UUID | None
    actor_user_id: uuid.UUID
    action: str
    entity_type: AuditEntityType
    entity_id: str | None
    entity_label: str | None
    field_name: str | None
    old_value: str | None
    new_value: str | None
    metadata_json: dict | None
    ip_address: str | None
    created_at: datetime
    actor: UserSummary | None = None

    model_config = ConfigDict(from_attributes=True)
