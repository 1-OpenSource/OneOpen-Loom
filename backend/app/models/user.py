import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.activity import AuditEvent
    from app.models.comment import Comment
    from app.models.project import Project, ProjectMember
    from app.models.work_item import WorkItem, WorkItemAttachment, WorkItemLink, WorkItemWatcher
    from app.models.workspace import Workspace, WorkspaceInvitation, WorkspaceMember


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    created_workspaces: Mapped[list["Workspace"]] = relationship(
        "Workspace", back_populates="creator", foreign_keys="Workspace.created_by"
    )
    workspace_memberships: Mapped[list["WorkspaceMember"]] = relationship(
        "WorkspaceMember", back_populates="user", cascade="all, delete-orphan"
    )
    workspace_invitations_sent: Mapped[list["WorkspaceInvitation"]] = relationship(
        "WorkspaceInvitation",
        back_populates="invited_by",
        foreign_keys="WorkspaceInvitation.invited_by_user_id",
    )
    led_projects: Mapped[list["Project"]] = relationship(
        "Project", back_populates="lead", foreign_keys="Project.lead_user_id"
    )
    project_memberships: Mapped[list["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="user", cascade="all, delete-orphan"
    )
    owned_work_items: Mapped[list["WorkItem"]] = relationship(
        "WorkItem", back_populates="owner", foreign_keys="WorkItem.owner_id"
    )
    created_work_items: Mapped[list["WorkItem"]] = relationship(
        "WorkItem", back_populates="creator", foreign_keys="WorkItem.creator_id"
    )
    reported_work_items: Mapped[list["WorkItem"]] = relationship(
        "WorkItem", back_populates="reporter", foreign_keys="WorkItem.reporter_id"
    )
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="user")
    uploaded_attachments: Mapped[list["WorkItemAttachment"]] = relationship(
        "WorkItemAttachment", back_populates="uploaded_by"
    )
    created_work_item_links: Mapped[list["WorkItemLink"]] = relationship(
        "WorkItemLink", back_populates="created_by"
    )
    work_item_watchers: Mapped[list["WorkItemWatcher"]] = relationship(
        "WorkItemWatcher", back_populates="user"
    )
    activities: Mapped[list["AuditEvent"]] = relationship("AuditEvent", back_populates="actor")
