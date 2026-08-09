import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.work_item import WorkItem


class SprintState(str, enum.Enum):
    FUTURE = "FUTURE"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class Sprint(Base):
    __tablename__ = "sprints"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    state: Mapped[SprintState] = mapped_column(
        Enum(SprintState, name="sprint_state"), nullable=False, default=SprintState.FUTURE
    )
    complete_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    items: Mapped[list["SprintItem"]] = relationship(
        "SprintItem", back_populates="sprint", cascade="all, delete-orphan"
    )
    metrics: Mapped[list["SprintMetric"]] = relationship(
        "SprintMetric", back_populates="sprint", cascade="all, delete-orphan"
    )


class SprintItem(Base):
    __tablename__ = "sprint_items"
    __table_args__ = (UniqueConstraint("work_item_id", name="uq_sprint_item_work_item"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sprint_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    work_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    committed_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sprint: Mapped["Sprint"] = relationship("Sprint", back_populates="items")
    work_item: Mapped["WorkItem"] = relationship("WorkItem")


class SprintMetric(Base):
    __tablename__ = "sprint_metrics"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sprint_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    committed_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sprint: Mapped["Sprint"] = relationship("Sprint", back_populates="metrics")
