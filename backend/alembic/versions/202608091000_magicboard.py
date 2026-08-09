"""Magicboard: space keys, page metadata, members, comments, watches, favorites.

Revision ID: 202608091000
Revises: 202608090003
Create Date: 2026-08-09
"""

from __future__ import annotations

import re
import uuid

import sqlalchemy as sa
from alembic import op

from app import models  # noqa: F401 - register models on Base.metadata
from app.db.database import Base

revision = "202608091000"
down_revision = "202608090003"
branch_labels = None
depends_on = None

NEW_TABLES = {
    "space_members",
    "space_page_comments",
    "space_page_watches",
    "space_watches",
    "space_page_favorites",
    "space_page_recents",
    "space_page_attachments",
}


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if table not in inspector.get_table_names():
        return set()
    return {col["name"] for col in inspector.get_columns(table)}


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return normalized or "page"


def _short_suffix() -> str:
    return uuid.uuid4().hex[:6]


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    is_sqlite = bind.dialect.name == "sqlite"

    space_cols = _column_names("spaces")
    if "key" not in space_cols:
        if is_sqlite:
            with op.batch_alter_table("spaces") as batch_op:
                batch_op.add_column(sa.Column("key", sa.String(length=40), nullable=True))
        else:
            op.add_column("spaces", sa.Column("key", sa.String(length=40), nullable=True))

    if "archived_at" not in space_cols:
        if is_sqlite:
            with op.batch_alter_table("spaces") as batch_op:
                batch_op.add_column(sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
        else:
            op.add_column("spaces", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))

    page_cols = _column_names("space_pages")
    page_additions: list[tuple[str, sa.Column]] = [
        ("slug", sa.Column("slug", sa.String(length=200), nullable=True)),
        (
            "status",
            sa.Column(
                "status",
                sa.Enum("DRAFT", "PUBLISHED", name="space_page_status"),
                nullable=True,
            ),
        ),
        ("icon", sa.Column("icon", sa.String(length=40), nullable=True)),
        ("owner_user_id", sa.Column("owner_user_id", sa.Uuid(as_uuid=True), nullable=True)),
        ("template_key", sa.Column("template_key", sa.String(length=80), nullable=True)),
        ("labels_json", sa.Column("labels_json", sa.JSON(), nullable=True)),
        ("archived_at", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True)),
    ]
    for col_name, column in page_additions:
        if col_name not in page_cols:
            if is_sqlite:
                with op.batch_alter_table("space_pages") as batch_op:
                    batch_op.add_column(column)
            else:
                op.add_column("space_pages", column)

    # Backfill space keys.
    connection = op.get_bind()
    spaces = connection.execute(sa.text("SELECT id, workspace_id, name, key FROM spaces")).fetchall()
    used_keys: dict[str, set[str]] = {}
    for row in spaces:
        space_id, workspace_id, name, key = row
        if key:
            used_keys.setdefault(str(workspace_id), set()).add(key.lower())
            continue
        base = _slugify(name)[:30] or "space"
        candidate = base
        suffix = 0
        workspace_key_set = used_keys.setdefault(str(workspace_id), set())
        while candidate.lower() in workspace_key_set:
            suffix += 1
            candidate = f"{base}-{suffix}" if suffix > 1 else f"{base}-{_short_suffix()}"
        workspace_key_set.add(candidate.lower())
        connection.execute(
            sa.text("UPDATE spaces SET key = :key WHERE id = :id"),
            {"key": candidate[:40], "id": space_id},
        )

    # Backfill page slugs.
    pages = connection.execute(
        sa.text("SELECT id, space_id, title, slug FROM space_pages")
    ).fetchall()
    used_slugs: dict[str, set[str]] = {}
    for row in pages:
        page_id, space_id, title, slug = row
        if slug:
            used_slugs.setdefault(str(space_id), set()).add(slug.lower())
            continue
        base = _slugify(title)[:180] or "page"
        candidate = base
        suffix = 0
        space_slug_set = used_slugs.setdefault(str(space_id), set())
        while candidate.lower() in space_slug_set:
            suffix += 1
            candidate = f"{base}-{suffix}"
        space_slug_set.add(candidate.lower())
        connection.execute(
            sa.text("UPDATE space_pages SET slug = :slug WHERE id = :id"),
            {"slug": candidate[:200], "id": page_id},
        )

    # Set defaults for status and labels_json where null.
    connection.execute(
        sa.text("UPDATE space_pages SET status = 'PUBLISHED' WHERE status IS NULL")
    )
    connection.execute(
        sa.text("UPDATE space_pages SET labels_json = '[]' WHERE labels_json IS NULL")
    )

    if is_sqlite:
        with op.batch_alter_table("spaces") as batch_op:
            batch_op.alter_column("key", existing_type=sa.String(length=40), nullable=False)
        with op.batch_alter_table("space_pages") as batch_op:
            batch_op.alter_column("slug", existing_type=sa.String(length=200), nullable=False)
            batch_op.alter_column(
                "status",
                existing_type=sa.Enum("DRAFT", "PUBLISHED", name="space_page_status"),
                nullable=False,
                server_default="PUBLISHED",
            )
            batch_op.alter_column("labels_json", existing_type=sa.JSON(), nullable=False, server_default="[]")
    else:
        op.alter_column("spaces", "key", existing_type=sa.String(length=40), nullable=False)
        op.alter_column("space_pages", "slug", existing_type=sa.String(length=200), nullable=False)
        op.alter_column(
            "space_pages",
            "status",
            existing_type=sa.Enum("DRAFT", "PUBLISHED", name="space_page_status"),
            nullable=False,
            server_default="PUBLISHED",
        )
        op.alter_column("space_pages", "labels_json", existing_type=sa.JSON(), nullable=False, server_default="[]")

    if "spaces" in existing_tables:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("spaces")}
        if "uq_space_workspace_key" not in existing_indexes:
            if is_sqlite:
                with op.batch_alter_table("spaces") as batch_op:
                    batch_op.create_unique_constraint("uq_space_workspace_key", ["workspace_id", "key"])
            else:
                op.create_unique_constraint("uq_space_workspace_key", "spaces", ["workspace_id", "key"])

    tables_to_create = [
        Base.metadata.tables[name]
        for name in sorted(NEW_TABLES)
        if name not in existing_tables and name in Base.metadata.tables
    ]
    if tables_to_create:
        Base.metadata.create_all(bind=bind, tables=tables_to_create)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    is_sqlite = bind.dialect.name == "sqlite"

    tables_to_drop = [
        Base.metadata.tables[name]
        for name in reversed(sorted(NEW_TABLES))
        if name in existing_tables and name in Base.metadata.tables
    ]
    if tables_to_drop:
        Base.metadata.drop_all(bind=bind, tables=tables_to_drop)

    space_cols = _column_names("spaces")
    if "uq_space_workspace_key" in {idx["name"] for idx in inspector.get_indexes("spaces")}:
        if is_sqlite:
            with op.batch_alter_table("spaces") as batch_op:
                batch_op.drop_constraint("uq_space_workspace_key", type_="unique")
        else:
            op.drop_constraint("uq_space_workspace_key", "spaces", type_="unique")

    page_cols = _column_names("space_pages")
    for col in ("archived_at", "labels_json", "template_key", "owner_user_id", "icon", "status", "slug"):
        if col in page_cols:
            if is_sqlite:
                with op.batch_alter_table("space_pages") as batch_op:
                    batch_op.drop_column(col)
            else:
                op.drop_column("space_pages", col)

    if "archived_at" in space_cols:
        if is_sqlite:
            with op.batch_alter_table("spaces") as batch_op:
                batch_op.drop_column("archived_at")
        else:
            op.drop_column("spaces", "archived_at")
    if "key" in space_cols:
        if is_sqlite:
            with op.batch_alter_table("spaces") as batch_op:
                batch_op.drop_column("key")
        else:
            op.drop_column("spaces", "key")
