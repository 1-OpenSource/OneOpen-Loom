"""Initial backend schema.

Revision ID: 202606210001
Revises:
Create Date: 2026-06-21 00:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202606210001"
down_revision = None
branch_labels = None
depends_on = None

WORKSPACE_ROLES = ("OWNER", "ADMIN", "MEMBER", "VIEWER")
WORK_ITEM_TYPES = ("TASK", "BUG", "STORY", "INITIATIVE", "SUBTASK")
WORK_ITEM_STATUSES = ("TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED")
WORK_ITEM_PRIORITIES = ("LOW", "MEDIUM", "HIGH", "CRITICAL")


def is_postgresql() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def uuid_type() -> sa.Uuid:
    return sa.Uuid(as_uuid=True)


def timestamp_default() -> sa.TextClause:
    if is_postgresql():
        return sa.text("now()")
    return sa.text("CURRENT_TIMESTAMP")


def enum_type(name: str, values: tuple[str, ...]) -> sa.Enum:
    if is_postgresql():
        return postgresql.ENUM(*values, name=name, create_type=False)
    return sa.Enum(*values, name=name, native_enum=False)


def create_postgresql_enums() -> None:
    if not is_postgresql():
        return

    bind = op.get_bind()
    postgresql.ENUM(*WORKSPACE_ROLES, name="workspace_role").create(bind, checkfirst=True)
    postgresql.ENUM(*WORK_ITEM_TYPES, name="work_item_type").create(bind, checkfirst=True)
    postgresql.ENUM(*WORK_ITEM_STATUSES, name="work_item_status").create(bind, checkfirst=True)
    postgresql.ENUM(*WORK_ITEM_PRIORITIES, name="work_item_priority").create(bind, checkfirst=True)


def drop_postgresql_enums() -> None:
    if not is_postgresql():
        return

    bind = op.get_bind()
    postgresql.ENUM(*WORK_ITEM_PRIORITIES, name="work_item_priority").drop(bind, checkfirst=True)
    postgresql.ENUM(*WORK_ITEM_STATUSES, name="work_item_status").drop(bind, checkfirst=True)
    postgresql.ENUM(*WORK_ITEM_TYPES, name="work_item_type").drop(bind, checkfirst=True)
    postgresql.ENUM(*WORKSPACE_ROLES, name="workspace_role").drop(bind, checkfirst=True)


def upgrade() -> None:
    create_postgresql_enums()

    workspace_role = enum_type("workspace_role", WORKSPACE_ROLES)
    work_item_type = enum_type("work_item_type", WORK_ITEM_TYPES)
    work_item_status = enum_type("work_item_status", WORK_ITEM_STATUSES)
    work_item_priority = enum_type("work_item_priority", WORK_ITEM_PRIORITIES)
    created_updated_default = timestamp_default()

    op.create_table(
        "users",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "workspaces",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("created_by", uuid_type(), nullable=False),
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
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_workspaces_slug", "workspaces", ["slug"], unique=False)

    op.create_table(
        "workspace_members",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("workspace_id", uuid_type(), nullable=False),
        sa.Column("user_id", uuid_type(), nullable=False),
        sa.Column("role", workspace_role, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )

    op.create_table(
        "projects",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("workspace_id", uuid_type(), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("key", sa.String(length=20), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("lead_user_id", uuid_type(), nullable=True),
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
        sa.ForeignKeyConstraint(["lead_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "key", name="uq_project_workspace_key"),
    )
    op.create_index("ix_projects_workspace_id", "projects", ["workspace_id"], unique=False)

    op.create_table(
        "work_items",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("project_id", uuid_type(), nullable=False),
        sa.Column("sequence_number", sa.Integer(), nullable=False),
        sa.Column("work_item_key", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("type", work_item_type, nullable=False),
        sa.Column("status", work_item_status, nullable=False),
        sa.Column("priority", work_item_priority, nullable=False),
        sa.Column("owner_id", uuid_type(), nullable=True),
        sa.Column("creator_id", uuid_type(), nullable=False),
        sa.Column("parent_work_item_id", uuid_type(), nullable=True),
        sa.Column("estimate_points", sa.Integer(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
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
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parent_work_item_id"], ["work_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "sequence_number", name="uq_work_item_project_sequence"),
        sa.UniqueConstraint("project_id", "work_item_key", name="uq_work_item_project_key"),
    )
    op.create_index("ix_work_items_project_id", "work_items", ["project_id"], unique=False)
    op.create_index("ix_work_items_work_item_key", "work_items", ["work_item_key"], unique=False)

    op.create_table(
        "comments",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("work_item_id", uuid_type(), nullable=False),
        sa.Column("user_id", uuid_type(), nullable=False),
        sa.Column("comment_text", sa.Text(), nullable=False),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_item_id"], ["work_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_comments_work_item_id", "comments", ["work_item_id"], unique=False)

    op.create_table(
        "activities",
        sa.Column("id", uuid_type(), nullable=False),
        sa.Column("work_item_id", uuid_type(), nullable=True),
        sa.Column("project_id", uuid_type(), nullable=True),
        sa.Column("workspace_id", uuid_type(), nullable=True),
        sa.Column("actor_user_id", uuid_type(), nullable=False),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("field_name", sa.String(length=120), nullable=True),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=created_updated_default,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_item_id"], ["work_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activities_actor_user_id", "activities", ["actor_user_id"], unique=False)
    op.create_index("ix_activities_project_id", "activities", ["project_id"], unique=False)
    op.create_index("ix_activities_work_item_id", "activities", ["work_item_id"], unique=False)
    op.create_index("ix_activities_workspace_id", "activities", ["workspace_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_activities_workspace_id", table_name="activities")
    op.drop_index("ix_activities_work_item_id", table_name="activities")
    op.drop_index("ix_activities_project_id", table_name="activities")
    op.drop_index("ix_activities_actor_user_id", table_name="activities")
    op.drop_table("activities")
    op.drop_index("ix_comments_work_item_id", table_name="comments")
    op.drop_table("comments")
    op.drop_index("ix_work_items_work_item_key", table_name="work_items")
    op.drop_index("ix_work_items_project_id", table_name="work_items")
    op.drop_table("work_items")
    op.drop_index("ix_projects_workspace_id", table_name="projects")
    op.drop_table("projects")
    op.drop_table("workspace_members")
    op.drop_index("ix_workspaces_slug", table_name="workspaces")
    op.drop_table("workspaces")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    drop_postgresql_enums()
