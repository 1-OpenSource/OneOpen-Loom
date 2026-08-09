"""Phase 1 foundational model expansion.

Revision ID: 202607120001
Revises: 202606210001
Create Date: 2026-07-12 00:00:00
"""

from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202607120001"
down_revision = "202606210001"
branch_labels = None
depends_on = None

WORKSPACE_VISIBILITY = ("PRIVATE", "PUBLIC")
WORKSPACE_MEMBER_STATUS = ("ACTIVE",)
WORKSPACE_INVITATION_STATUS = ("PENDING", "ACCEPTED", "REVOKED")
PROJECT_VISIBILITY = ("PRIVATE", "PUBLIC")
PROJECT_ROLES = ("PROJECT_ADMIN", "DEVELOPER", "CONTRIBUTOR", "VIEWER")
WORK_ITEM_LINK_TYPES = (
    "BLOCKS",
    "IS_BLOCKED_BY",
    "RELATES_TO",
    "DUPLICATES",
    "IS_DUPLICATED_BY",
    "PARENT_OF",
    "CHILD_OF",
)
AUDIT_ENTITY_TYPES = (
    "WORKSPACE",
    "PROJECT",
    "WORK_ITEM",
    "COMMENT",
    "ATTACHMENT",
    "MEMBERSHIP",
    "INVITATION",
    "WORK_ITEM_LINK",
    "SEARCH",
)
ADDITIONAL_WORK_ITEM_TYPES = ("EPIC", "SPIKE", "IMPROVEMENT", "FEATURE_REQUEST", "RESEARCH")
ADDITIONAL_WORK_ITEM_PRIORITIES = ("LOWEST",)


def is_postgresql() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def uuid_type() -> sa.Uuid:
    return sa.Uuid(as_uuid=True)


def timestamp_default() -> sa.TextClause:
    if is_postgresql():
        return sa.text("now()")
    return sa.text("CURRENT_TIMESTAMP")


def json_default_array() -> sa.TextClause:
    if is_postgresql():
        return sa.text("'[]'::json")
    return sa.text("'[]'")


def enum_type(name: str, values: tuple[str, ...]) -> sa.Enum:
    if is_postgresql():
        return postgresql.ENUM(*values, name=name, create_type=False)
    return sa.Enum(*values, name=name, native_enum=False)


def create_postgresql_enum(name: str, values: tuple[str, ...]) -> None:
    if not is_postgresql():
        return
    bind = op.get_bind()
    postgresql.ENUM(*values, name=name).create(bind, checkfirst=True)


def add_postgresql_enum_values(enum_name: str, values: tuple[str, ...]) -> None:
    if not is_postgresql():
        return
    for value in values:
        op.execute(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{value}'")


def create_default_workflow_statuses() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id FROM projects")).fetchall()
    default_statuses = [
        ("TODO", "To Do", "#94a3b8"),
        ("IN_PROGRESS", "In Progress", "#3b82f6"),
        ("IN_REVIEW", "In Review", "#8b5cf6"),
        ("DONE", "Done", "#16a34a"),
        ("BLOCKED", "Blocked", "#dc2626"),
    ]
    workflow_status_table = sa.table(
        "workflow_statuses",
        sa.column("id", uuid_type()),
        sa.column("project_id", uuid_type()),
        sa.column("name", sa.String),
        sa.column("key", sa.String),
        sa.column("color", sa.String),
        sa.column("position", sa.Integer),
        sa.column("is_default", sa.Boolean),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    for row in rows:
        project_id = row[0]
        for index, (key, name, color) in enumerate(default_statuses):
            op.bulk_insert(
                workflow_status_table,
                [
                    {
                        "id": uuid.uuid4(),
                        "project_id": project_id,
                        "name": name,
                        "key": key,
                        "color": color,
                        "position": index,
                        "is_default": index == 0,
                    }
                ],
            )


def upgrade() -> None:
    create_postgresql_enum("workspace_visibility", WORKSPACE_VISIBILITY)
    create_postgresql_enum("workspace_member_status", WORKSPACE_MEMBER_STATUS)
    create_postgresql_enum("workspace_invitation_status", WORKSPACE_INVITATION_STATUS)
    create_postgresql_enum("project_visibility", PROJECT_VISIBILITY)
    create_postgresql_enum("project_role", PROJECT_ROLES)
    create_postgresql_enum("work_item_link_type", WORK_ITEM_LINK_TYPES)
    create_postgresql_enum("audit_entity_type", AUDIT_ENTITY_TYPES)
    add_postgresql_enum_values("work_item_type", ADDITIONAL_WORK_ITEM_TYPES)
    add_postgresql_enum_values("work_item_priority", ADDITIONAL_WORK_ITEM_PRIORITIES)

    workspace_visibility = enum_type("workspace_visibility", WORKSPACE_VISIBILITY)
    workspace_member_status = enum_type("workspace_member_status", WORKSPACE_MEMBER_STATUS)
    workspace_role = enum_type("workspace_role", ("OWNER", "ADMIN", "MEMBER", "VIEWER"))
    workspace_invitation_status = enum_type("workspace_invitation_status", WORKSPACE_INVITATION_STATUS)
    project_visibility = enum_type("project_visibility", PROJECT_VISIBILITY)
    project_role = enum_type("project_role", PROJECT_ROLES)
    work_item_link_type = enum_type("work_item_link_type", WORK_ITEM_LINK_TYPES)
    audit_entity_type = enum_type("audit_entity_type", AUDIT_ENTITY_TYPES)
    created_updated_default = timestamp_default()

    op.add_column("workspaces", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("workspaces", sa.Column("logo_url", sa.String(length=500), nullable=True))
    op.add_column(
        "workspaces",
        sa.Column(
            "visibility",
            workspace_visibility,
            nullable=False,
            server_default=sa.text("'PRIVATE'"),
        ),
    )
    op.add_column("workspaces", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column(
        "workspace_members",
        sa.Column(
            "status",
            workspace_member_status,
            nullable=False,
            server_default=sa.text("'ACTIVE'"),
        ),
    )
    op.add_column(
        "workspace_members",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=created_updated_default,
        ),
    )

    op.add_column("projects", sa.Column("icon", sa.String(length=80), nullable=True))
    op.add_column("projects", sa.Column("color", sa.String(length=20), nullable=True))
    op.add_column(
        "projects",
        sa.Column(
            "visibility",
            project_visibility,
            nullable=False,
            server_default=sa.text("'PUBLIC'"),
        ),
    )
    op.add_column("projects", sa.Column("default_workflow", sa.String(length=80), nullable=True))
    op.add_column(
        "projects",
        sa.Column(
            "available_work_item_types",
            sa.JSON(),
            nullable=False,
            server_default=json_default_array(),
        ),
    )
    op.add_column(
        "projects",
        sa.Column("next_work_item_number", sa.Integer(), nullable=False, server_default=sa.text("1")),
    )
    op.add_column("projects", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("projects", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("work_items", sa.Column("acceptance_criteria", sa.Text(), nullable=True))
    op.add_column("work_items", sa.Column("reporter_id", uuid_type(), nullable=True))
    op.add_column("work_items", sa.Column("sprint_name", sa.String(length=80), nullable=True))
    op.add_column("work_items", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("work_items", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("work_items", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("work_items", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "work_items",
        sa.Column("components", sa.JSON(), nullable=False, server_default=json_default_array()),
    )
    if is_postgresql():
        op.create_foreign_key(
            "fk_work_items_reporter_id_users",
            "work_items",
            "users",
            ["reporter_id"],
            ["id"],
            ondelete="SET NULL",
        )

    op.add_column(
        "activities",
        sa.Column(
            "entity_type",
            audit_entity_type,
            nullable=False,
            server_default=sa.text("'WORK_ITEM'"),
        ),
    )
    op.add_column("activities", sa.Column("entity_id", sa.String(length=120), nullable=True))
    op.add_column("activities", sa.Column("entity_label", sa.String(length=240), nullable=True))
    op.add_column("activities", sa.Column("metadata_json", sa.JSON(), nullable=True))
    op.add_column("activities", sa.Column("ip_address", sa.String(length=80), nullable=True))

    op.create_table(
        "workspace_invitations",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("workspace_id", uuid_type(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", workspace_role, nullable=False),
        sa.Column("token", sa.String(length=120), nullable=False),
        sa.Column("invited_by_user_id", uuid_type(), nullable=False),
        sa.Column("status", workspace_invitation_status, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
        sa.UniqueConstraint("workspace_id", "email", "status", name="uq_workspace_invitation_active"),
    )
    op.create_index("ix_workspace_invitations_workspace_id", "workspace_invitations", ["workspace_id"], unique=False)
    op.create_index("ix_workspace_invitations_email", "workspace_invitations", ["email"], unique=False)
    op.create_index("ix_workspace_invitations_token", "workspace_invitations", ["token"], unique=False)

    op.create_table(
        "project_members",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("project_id", uuid_type(), nullable=False),
        sa.Column("user_id", uuid_type(), nullable=False),
        sa.Column("role", project_role, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_member"),
    )
    op.create_index("ix_project_members_project_id", "project_members", ["project_id"], unique=False)

    op.create_table(
        "workflow_statuses",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("project_id", uuid_type(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("key", sa.String(length=40), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "key", name="uq_project_workflow_status_key"),
    )
    op.create_index("ix_workflow_statuses_project_id", "workflow_statuses", ["project_id"], unique=False)

    op.create_table(
        "work_item_attachments",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("work_item_id", uuid_type(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("stored_path", sa.String(length=500), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("uploaded_by_user_id", uuid_type(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["work_item_id"], ["work_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stored_path"),
    )
    op.create_index("ix_work_item_attachments_work_item_id", "work_item_attachments", ["work_item_id"], unique=False)

    op.create_table(
        "work_item_links",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("source_work_item_id", uuid_type(), nullable=False),
        sa.Column("target_work_item_id", uuid_type(), nullable=False),
        sa.Column("link_type", work_item_link_type, nullable=False),
        sa.Column("created_by_user_id", uuid_type(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["source_work_item_id"], ["work_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_work_item_id"], ["work_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_work_item_id",
            "target_work_item_id",
            "link_type",
            name="uq_work_item_link_type",
        ),
    )
    op.create_index("ix_work_item_links_source_work_item_id", "work_item_links", ["source_work_item_id"], unique=False)
    op.create_index("ix_work_item_links_target_work_item_id", "work_item_links", ["target_work_item_id"], unique=False)

    op.create_table(
        "work_item_labels",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("work_item_id", uuid_type(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["work_item_id"], ["work_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("work_item_id", "name", name="uq_work_item_label"),
    )
    op.create_index("ix_work_item_labels_work_item_id", "work_item_labels", ["work_item_id"], unique=False)

    op.create_table(
        "work_item_watchers",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("work_item_id", uuid_type(), nullable=False),
        sa.Column("user_id", uuid_type(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["work_item_id"], ["work_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("work_item_id", "user_id", name="uq_work_item_watcher"),
    )
    op.create_index("ix_work_item_watchers_work_item_id", "work_item_watchers", ["work_item_id"], unique=False)

    op.execute("UPDATE workspace_members SET status = 'ACTIVE'")
    op.execute("UPDATE workspace_members SET updated_at = created_at WHERE updated_at IS NULL")
    op.execute("UPDATE workspaces SET visibility = 'PRIVATE' WHERE visibility IS NULL")
    op.execute("UPDATE projects SET visibility = 'PUBLIC' WHERE visibility IS NULL")
    if is_postgresql():
        op.execute(
            "UPDATE projects SET available_work_item_types = '[\"EPIC\",\"STORY\",\"TASK\",\"BUG\",\"SPIKE\",\"SUBTASK\",\"IMPROVEMENT\",\"FEATURE_REQUEST\",\"RESEARCH\"]'::json"
        )
        op.execute("UPDATE work_items SET components = '[]'::json WHERE components IS NULL")
    else:
        op.execute(
            "UPDATE projects SET available_work_item_types = '[\"EPIC\",\"STORY\",\"TASK\",\"BUG\",\"SPIKE\",\"SUBTASK\",\"IMPROVEMENT\",\"FEATURE_REQUEST\",\"RESEARCH\"]'"
        )
        op.execute("UPDATE work_items SET components = '[]' WHERE components IS NULL")
    op.execute(
        """
        UPDATE projects
        SET next_work_item_number = COALESCE(
            (SELECT MAX(work_items.sequence_number) + 1 FROM work_items WHERE work_items.project_id = projects.id),
            1
        )
        """
    )
    op.execute("UPDATE work_items SET reporter_id = creator_id WHERE reporter_id IS NULL")
    op.execute("UPDATE activities SET entity_type = 'WORK_ITEM' WHERE entity_type IS NULL")

    create_default_workflow_statuses()


def downgrade() -> None:
    op.drop_index("ix_work_item_watchers_work_item_id", table_name="work_item_watchers")
    op.drop_table("work_item_watchers")
    op.drop_index("ix_work_item_labels_work_item_id", table_name="work_item_labels")
    op.drop_table("work_item_labels")
    op.drop_index("ix_work_item_links_target_work_item_id", table_name="work_item_links")
    op.drop_index("ix_work_item_links_source_work_item_id", table_name="work_item_links")
    op.drop_table("work_item_links")
    op.drop_index("ix_work_item_attachments_work_item_id", table_name="work_item_attachments")
    op.drop_table("work_item_attachments")
    op.drop_index("ix_workflow_statuses_project_id", table_name="workflow_statuses")
    op.drop_table("workflow_statuses")
    op.drop_index("ix_project_members_project_id", table_name="project_members")
    op.drop_table("project_members")
    op.drop_index("ix_workspace_invitations_token", table_name="workspace_invitations")
    op.drop_index("ix_workspace_invitations_email", table_name="workspace_invitations")
    op.drop_index("ix_workspace_invitations_workspace_id", table_name="workspace_invitations")
    op.drop_table("workspace_invitations")

    op.drop_column("activities", "ip_address")
    op.drop_column("activities", "metadata_json")
    op.drop_column("activities", "entity_label")
    op.drop_column("activities", "entity_id")
    op.drop_column("activities", "entity_type")

    if is_postgresql():
        op.drop_constraint("fk_work_items_reporter_id_users", "work_items", type_="foreignkey")
    op.drop_column("work_items", "components")
    op.drop_column("work_items", "deleted_at")
    op.drop_column("work_items", "archived_at")
    op.drop_column("work_items", "completed_at")
    op.drop_column("work_items", "start_date")
    op.drop_column("work_items", "sprint_name")
    op.drop_column("work_items", "reporter_id")
    op.drop_column("work_items", "acceptance_criteria")

    op.drop_column("projects", "deleted_at")
    op.drop_column("projects", "archived_at")
    op.drop_column("projects", "next_work_item_number")
    op.drop_column("projects", "available_work_item_types")
    op.drop_column("projects", "default_workflow")
    op.drop_column("projects", "visibility")
    op.drop_column("projects", "color")
    op.drop_column("projects", "icon")

    op.drop_column("workspace_members", "updated_at")
    op.drop_column("workspace_members", "status")

    op.drop_column("workspaces", "deleted_at")
    op.drop_column("workspaces", "visibility")
    op.drop_column("workspaces", "logo_url")
    op.drop_column("workspaces", "description")

    if is_postgresql():
        bind = op.get_bind()
        postgresql.ENUM(*AUDIT_ENTITY_TYPES, name="audit_entity_type").drop(bind, checkfirst=True)
        postgresql.ENUM(*WORK_ITEM_LINK_TYPES, name="work_item_link_type").drop(bind, checkfirst=True)
        postgresql.ENUM(*PROJECT_ROLES, name="project_role").drop(bind, checkfirst=True)
        postgresql.ENUM(*PROJECT_VISIBILITY, name="project_visibility").drop(bind, checkfirst=True)
        postgresql.ENUM(*WORKSPACE_INVITATION_STATUS, name="workspace_invitation_status").drop(bind, checkfirst=True)
        postgresql.ENUM(*WORKSPACE_MEMBER_STATUS, name="workspace_member_status").drop(bind, checkfirst=True)
        postgresql.ENUM(*WORKSPACE_VISIBILITY, name="workspace_visibility").drop(bind, checkfirst=True)
