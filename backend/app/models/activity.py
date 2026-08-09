import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User
    from app.models.work_item import WorkItem
    from app.models.workspace import Workspace


class AuditEntityType(str, enum.Enum):
    WORKSPACE = "WORKSPACE"
    PROJECT = "PROJECT"
    WORK_ITEM = "WORK_ITEM"
    COMMENT = "COMMENT"
    ATTACHMENT = "ATTACHMENT"
    MEMBERSHIP = "MEMBERSHIP"
    INVITATION = "INVITATION"
    WORK_ITEM_LINK = "WORK_ITEM_LINK"
    SEARCH = "SEARCH"


class AuditEvent(Base):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_item_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=True, index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True
    )
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[AuditEntityType] = mapped_column(
        Enum(AuditEntityType, name="audit_entity_type"),
        nullable=False,
        default=AuditEntityType.WORK_ITEM,
    )
    entity_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    entity_label: Mapped[str | None] = mapped_column(String(240), nullable=True)
    field_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    work_item: Mapped["WorkItem | None"] = relationship("WorkItem", back_populates="activities")
    project: Mapped["Project | None"] = relationship("Project", back_populates="activities")
    workspace: Mapped["Workspace | None"] = relationship("Workspace", back_populates="activities")
    actor: Mapped["User"] = relationship("User", back_populates="activities")


Activity = AuditEvent
