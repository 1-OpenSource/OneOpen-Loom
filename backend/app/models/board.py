import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    pass


class WorkflowRuleKind(str, enum.Enum):
    CONDITION = "CONDITION"
    VALIDATOR = "VALIDATOR"
    POST_FUNCTION = "POST_FUNCTION"


class WorkflowTransition(Base):
    __tablename__ = "workflow_transitions"
    __table_args__ = (
        UniqueConstraint("project_id", "from_status_id", "to_status_id", name="uq_workflow_transition"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_status_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("workflow_statuses.id", ondelete="CASCADE"), nullable=False
    )
    to_status_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("workflow_statuses.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    rules: Mapped[list["WorkflowTransitionRule"]] = relationship(
        "WorkflowTransitionRule",
        back_populates="transition",
        cascade="all, delete-orphan",
        order_by="WorkflowTransitionRule.position",
    )


class WorkflowTransitionRule(Base):
    __tablename__ = "workflow_transition_rules"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transition_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("workflow_transitions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(30), nullable=False, default=WorkflowRuleKind.CONDITION.value)
    rule_type: Mapped[str] = mapped_column(String(80), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    transition: Mapped["WorkflowTransition"] = relationship("WorkflowTransition", back_populates="rules")


class BoardColumn(Base):
    __tablename__ = "board_columns"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wip_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    statuses: Mapped[list["BoardColumnStatus"]] = relationship(
        "BoardColumnStatus",
        back_populates="column",
        cascade="all, delete-orphan",
        order_by="BoardColumnStatus.id",
    )

    @property
    def status_ids(self) -> list[uuid.UUID]:
        return [row.status_id for row in self.statuses]


class BoardColumnStatus(Base):
    __tablename__ = "board_column_statuses"
    __table_args__ = (UniqueConstraint("column_id", "status_id", name="uq_board_column_status"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    column_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("board_columns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("workflow_statuses.id", ondelete="CASCADE"), nullable=False
    )

    column: Mapped["BoardColumn"] = relationship("BoardColumn", back_populates="statuses")
