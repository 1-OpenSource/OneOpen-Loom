"""Magicboard page share links.

Revision ID: 202608091100
Revises: 202608091000
Create Date: 2026-08-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app import models  # noqa: F401
from app.db.database import Base

revision = "202608091100"
down_revision = "202608091000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "space_page_share_links" in inspector.get_table_names():
        return
    Base.metadata.tables["space_page_share_links"].create(bind=bind, checkfirst=True)


def downgrade() -> None:
    op.drop_table("space_page_share_links")
