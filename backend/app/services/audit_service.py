import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.activity import AuditEntityType, AuditEvent


def stringify(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (list, dict)):
        return str(value)
    if hasattr(value, "value"):
        return str(value.value)
    return str(value)


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def record(
        self,
        *,
        actor_user_id: uuid.UUID,
        action: str,
        entity_type: AuditEntityType,
        entity_id: str | None = None,
        entity_label: str | None = None,
        work_item_id: uuid.UUID | None = None,
        project_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        field_name: str | None = None,
        old_value: Any = None,
        new_value: Any = None,
        metadata_json: dict | None = None,
        ip_address: str | None = None,
    ) -> AuditEvent:
        event = AuditEvent(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            work_item_id=work_item_id,
            project_id=project_id,
            workspace_id=workspace_id,
            field_name=field_name,
            old_value=stringify(old_value),
            new_value=stringify(new_value),
            metadata_json=metadata_json,
            ip_address=ip_address,
        )
        self.db.add(event)
        self.db.flush()
        return event
