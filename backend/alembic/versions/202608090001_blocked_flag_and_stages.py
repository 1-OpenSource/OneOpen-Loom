"""Add is_blocked flag and workflow stage categories.

Revision ID: 202608090001
Revises: 202607120001
Create Date: 2026-08-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "202608090001"
down_revision = "202607120001"
branch_labels = None
depends_on = None


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table)}


def upgrade() -> None:
    work_item_cols = _column_names("work_items")
    if "is_blocked" not in work_item_cols:
        op.add_column(
            "work_items",
            sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    workflow_cols = _column_names("workflow_statuses")
    if "category" not in workflow_cols:
        op.add_column(
            "workflow_statuses",
            sa.Column("category", sa.String(length=40), nullable=False, server_default="in_progress"),
        )

    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE work_items
            SET is_blocked = 1,
                status = 'IN_PROGRESS'
            WHERE status = 'BLOCKED'
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE workflow_statuses
            SET category = CASE key
                WHEN 'TODO' THEN 'todo'
                WHEN 'DONE' THEN 'done'
                ELSE 'in_progress'
            END
            """
        )
    )
    connection.execute(sa.text("DELETE FROM workflow_statuses WHERE key = 'BLOCKED'"))

    # SQLite cannot ALTER COLUMN to drop server defaults; leave defaults in place there.
    if connection.dialect.name != "sqlite":
        op.alter_column("work_items", "is_blocked", server_default=None)
        op.alter_column("workflow_statuses", "category", server_default=None)


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE work_items
            SET status = 'BLOCKED'
            WHERE is_blocked = 1
            """
        )
    )
    op.drop_column("workflow_statuses", "category")
    op.drop_column("work_items", "is_blocked")
