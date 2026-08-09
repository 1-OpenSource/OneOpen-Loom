"""Product parity phases 2-15: sprints, boards, fields, OQL, reports, automation,
notifications, plans, versions, dashboards, service desk, spaces, enterprise,
integrations.

Revision ID: 202608090002
Revises: 202608090001
Create Date: 2026-08-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app import models  # noqa: F401 - ensures all new models are registered on Base.metadata
from app.db.database import Base

revision = "202608090002"
down_revision = "202608090001"
branch_labels = None
depends_on = None

# Tables that already existed prior to this migration. Everything else currently
# registered on Base.metadata was introduced by the parity phases and should be
# created here if missing.
BASELINE_TABLES = {
    "activities",
    "comments",
    "project_members",
    "projects",
    "users",
    "work_item_attachments",
    "work_item_labels",
    "work_item_links",
    "work_item_watchers",
    "work_items",
    "workflow_statuses",
    "workspace_invitations",
    "workspace_members",
    "workspaces",
}


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    new_table_names = set(Base.metadata.tables.keys()) - BASELINE_TABLES
    tables_to_create = [
        Base.metadata.tables[name]
        for name in sorted(new_table_names)
        if name not in existing_tables
    ]
    if tables_to_create:
        Base.metadata.create_all(bind=bind, tables=tables_to_create)

    work_item_cols = _column_names("work_items")
    if "rank" not in work_item_cols:
        op.add_column(
            "work_items", sa.Column("rank", sa.String(length=64), nullable=False, server_default="")
        )
    if "epic_id" not in work_item_cols:
        op.add_column(
            "work_items",
            sa.Column("epic_id", sa.Uuid(as_uuid=True), nullable=True),
        )
    if "original_estimate_seconds" not in work_item_cols:
        op.add_column(
            "work_items", sa.Column("original_estimate_seconds", sa.Integer(), nullable=True)
        )
    if "remaining_estimate_seconds" not in work_item_cols:
        op.add_column(
            "work_items", sa.Column("remaining_estimate_seconds", sa.Integer(), nullable=True)
        )

    project_cols = _column_names("projects")
    if "product_type" not in project_cols:
        op.add_column(
            "projects",
            sa.Column("product_type", sa.String(length=20), nullable=False, server_default="SOFTWARE"),
        )

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("work_items")}
    if "ix_work_items_project_rank" not in existing_indexes:
        op.create_index("ix_work_items_project_rank", "work_items", ["project_id", "rank"])

    _backfill_ranks(bind)

    connection = op.get_bind()
    if connection.dialect.name != "sqlite":
        op.alter_column("work_items", "rank", server_default=None)
        op.alter_column("projects", "product_type", server_default=None)


def _backfill_ranks(bind: sa.engine.Connection) -> None:
    """Assign a stable, sortable rank to any work item that doesn't have one yet."""
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    width = 12
    step = 1_000_000

    def to_rank(value: int) -> str:
        if value <= 0:
            return "0".rjust(width, "0")
        digits: list[str] = []
        remaining = value
        while remaining > 0:
            remaining, rem = divmod(remaining, 36)
            digits.append(alphabet[rem])
        return "".join(reversed(digits)).rjust(width, "0")

    work_items_table = sa.table(
        "work_items",
        sa.column("id"),
        sa.column("project_id"),
        sa.column("sequence_number"),
        sa.column("rank"),
    )
    rows = bind.execute(
        sa.select(
            work_items_table.c.id,
            work_items_table.c.project_id,
            work_items_table.c.sequence_number,
        )
        .where(sa.or_(work_items_table.c.rank.is_(None), work_items_table.c.rank == ""))
        .order_by(work_items_table.c.project_id, work_items_table.c.sequence_number)
    ).fetchall()

    for row in rows:
        rank_value = to_rank((row.sequence_number + 1) * step)
        bind.execute(
            work_items_table.update()
            .where(work_items_table.c.id == row.id)
            .values(rank=rank_value)
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("work_items")}
    if "ix_work_items_project_rank" in existing_indexes:
        op.drop_index("ix_work_items_project_rank", table_name="work_items")

    op.drop_column("projects", "product_type")
    op.drop_column("work_items", "remaining_estimate_seconds")
    op.drop_column("work_items", "original_estimate_seconds")
    op.drop_column("work_items", "epic_id")
    op.drop_column("work_items", "rank")

    new_table_names = set(Base.metadata.tables.keys()) - BASELINE_TABLES
    existing_tables = set(inspector.get_table_names())
    tables_to_drop = [
        Base.metadata.tables[name]
        for name in sorted(new_table_names, reverse=True)
        if name in existing_tables
    ]
    if tables_to_drop:
        Base.metadata.drop_all(bind=bind, tables=tables_to_drop)
