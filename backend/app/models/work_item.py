import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.activity import AuditEvent
    from app.models.comment import Comment
    from app.models.project import Project
    from app.models.user import User


class WorkItemType(str, enum.Enum):
    EPIC = "EPIC"
    STORY = "STORY"
    TASK = "TASK"
    BUG = "BUG"
    SPIKE = "SPIKE"
    SUBTASK = "SUBTASK"
    IMPROVEMENT = "IMPROVEMENT"
    FEATURE_REQUEST = "FEATURE_REQUEST"
    RESEARCH = "RESEARCH"


class WorkItemStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"
    # Legacy value retained for DB compatibility; new writes use is_blocked instead.
    BLOCKED = "BLOCKED"


STAGE_STATUSES = {
    WorkItemStatus.TODO,
    WorkItemStatus.IN_PROGRESS,
    WorkItemStatus.IN_REVIEW,
    WorkItemStatus.DONE,
}

ALLOWED_STATUS_TRANSITIONS: dict[WorkItemStatus, set[WorkItemStatus]] = {
    WorkItemStatus.TODO: {WorkItemStatus.IN_PROGRESS},
    WorkItemStatus.IN_PROGRESS: {WorkItemStatus.IN_REVIEW, WorkItemStatus.TODO},
    WorkItemStatus.IN_REVIEW: {WorkItemStatus.DONE, WorkItemStatus.IN_PROGRESS},
    WorkItemStatus.DONE: {WorkItemStatus.IN_PROGRESS},
    WorkItemStatus.BLOCKED: {WorkItemStatus.TODO, WorkItemStatus.IN_PROGRESS, WorkItemStatus.IN_REVIEW},
}


class WorkItemPriority(str, enum.Enum):
    LOWEST = "LOWEST"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class WorkItemLinkType(str, enum.Enum):
    BLOCKS = "BLOCKS"
    IS_BLOCKED_BY = "IS_BLOCKED_BY"
    RELATES_TO = "RELATES_TO"
    DUPLICATES = "DUPLICATES"
    IS_DUPLICATED_BY = "IS_DUPLICATED_BY"
    PARENT_OF = "PARENT_OF"
    CHILD_OF = "CHILD_OF"


class WorkItem(Base):
    __tablename__ = "work_items"
    __table_args__ = (
        UniqueConstraint("project_id", "work_item_key", name="uq_work_item_project_key"),
        UniqueConstraint("project_id", "sequence_number", name="uq_work_item_project_sequence"),
        Index("ix_work_items_project_rank", "project_id", "rank"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    work_item_key: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    acceptance_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[WorkItemType] = mapped_column(
        Enum(WorkItemType, name="work_item_type"), nullable=False, default=WorkItemType.TASK
    )
    status: Mapped[WorkItemStatus] = mapped_column(
        Enum(WorkItemStatus, name="work_item_status"),
        nullable=False,
        default=WorkItemStatus.TODO,
    )
    is_blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    priority: Mapped[WorkItemPriority] = mapped_column(
        Enum(WorkItemPriority, name="work_item_priority"),
        nullable=False,
        default=WorkItemPriority.MEDIUM,
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    parent_work_item_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("work_items.id", ondelete="SET NULL"), nullable=True
    )
    epic_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("work_items.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rank: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    sprint_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    estimate_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    original_estimate_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    remaining_estimate_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    components: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    project: Mapped["Project"] = relationship("Project", back_populates="work_items")
    owner: Mapped["User | None"] = relationship(
        "User", back_populates="owned_work_items", foreign_keys=[owner_id]
    )
    creator: Mapped["User"] = relationship(
        "User", back_populates="created_work_items", foreign_keys=[creator_id]
    )
    reporter: Mapped["User | None"] = relationship(
        "User", back_populates="reported_work_items", foreign_keys=[reporter_id]
    )
    parent_work_item: Mapped["WorkItem | None"] = relationship(
        "WorkItem",
        remote_side=[id],
        back_populates="subtasks",
        foreign_keys=[parent_work_item_id],
    )
    subtasks: Mapped[list["WorkItem"]] = relationship(
        "WorkItem", back_populates="parent_work_item", foreign_keys=[parent_work_item_id]
    )
    epic: Mapped["WorkItem | None"] = relationship(
        "WorkItem", remote_side=[id], foreign_keys=[epic_id], viewonly=True
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="work_item", cascade="all, delete-orphan"
    )
    attachments: Mapped[list["WorkItemAttachment"]] = relationship(
        "WorkItemAttachment", back_populates="work_item", cascade="all, delete-orphan"
    )
    outgoing_links: Mapped[list["WorkItemLink"]] = relationship(
        "WorkItemLink",
        foreign_keys="WorkItemLink.source_work_item_id",
        back_populates="source_work_item",
        cascade="all, delete-orphan",
    )
    incoming_links: Mapped[list["WorkItemLink"]] = relationship(
        "WorkItemLink",
        foreign_keys="WorkItemLink.target_work_item_id",
        back_populates="target_work_item",
        cascade="all, delete-orphan",
    )
    labels: Mapped[list["WorkItemLabel"]] = relationship(
        "WorkItemLabel", back_populates="work_item", cascade="all, delete-orphan"
    )
    watchers: Mapped[list["WorkItemWatcher"]] = relationship(
        "WorkItemWatcher", back_populates="work_item", cascade="all, delete-orphan"
    )
    activities: Mapped[list["AuditEvent"]] = relationship(
        "AuditEvent", back_populates="work_item", cascade="all, delete-orphan"
    )

    @property
    def assignee_user_id(self) -> uuid.UUID | None:
        return self.owner_id

    @assignee_user_id.setter
    def assignee_user_id(self, value: uuid.UUID | None) -> None:
        self.owner_id = value

    @property
    def story_points(self) -> int | None:
        return self.estimate_points

    @story_points.setter
    def story_points(self, value: int | None) -> None:
        self.estimate_points = value


class WorkItemAttachment(Base):
    __tablename__ = "work_item_attachments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    content_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    work_item: Mapped["WorkItem"] = relationship("WorkItem", back_populates="attachments")
    uploaded_by: Mapped["User"] = relationship("User", back_populates="uploaded_attachments")


class WorkItemLink(Base):
    __tablename__ = "work_item_links"
    __table_args__ = (
        UniqueConstraint(
            "source_work_item_id",
            "target_work_item_id",
            "link_type",
            name="uq_work_item_link_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_work_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_work_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    link_type: Mapped[WorkItemLinkType] = mapped_column(
        Enum(WorkItemLinkType, name="work_item_link_type"), nullable=False
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    source_work_item: Mapped["WorkItem"] = relationship(
        "WorkItem", foreign_keys=[source_work_item_id], back_populates="outgoing_links"
    )
    target_work_item: Mapped["WorkItem"] = relationship(
        "WorkItem", foreign_keys=[target_work_item_id], back_populates="incoming_links"
    )
    created_by: Mapped["User"] = relationship("User", back_populates="created_work_item_links")


class WorkItemLabel(Base):
    __tablename__ = "work_item_labels"
    __table_args__ = (UniqueConstraint("work_item_id", "name", name="uq_work_item_label"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    work_item: Mapped["WorkItem"] = relationship("WorkItem", back_populates="labels")


class WorkItemWatcher(Base):
    __tablename__ = "work_item_watchers"
    __table_args__ = (UniqueConstraint("work_item_id", "user_id", name="uq_work_item_watcher"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    work_item: Mapped["WorkItem"] = relationship("WorkItem", back_populates="watchers")
    user: Mapped["User"] = relationship("User", back_populates="work_item_watchers")
