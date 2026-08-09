"""Admin completeness: branding, SMTP, domains, SAML, workflow rules, issue type schemes.

Revision ID: 202608090003
Revises: 202608090002
Create Date: 2026-08-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app import models  # noqa: F401 - register models on Base.metadata
from app.db.database import Base

revision = "202608090003"
down_revision = "202608090002"
branch_labels = None
depends_on = None

NEW_TABLES = {
    "workspace_smtp_settings",
    "email_templates",
    "workspace_domains",
    "workspace_dns_providers",
    "issue_type_schemes",
    "issue_type_scheme_items",
    "workflow_transition_rules",
}


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if table not in inspector.get_table_names():
        return set()
    return {col["name"] for col in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # Create issue_type_schemes before adding the projects FK column.
    ordered = [
        "issue_type_schemes",
        "issue_type_scheme_items",
        "workspace_smtp_settings",
        "email_templates",
        "workspace_domains",
        "workspace_dns_providers",
        "workflow_transition_rules",
    ]
    tables_to_create = [
        Base.metadata.tables[name]
        for name in ordered
        if name in NEW_TABLES and name not in existing_tables and name in Base.metadata.tables
    ]
    if tables_to_create:
        Base.metadata.create_all(bind=bind, tables=tables_to_create)

    workspace_cols = _column_names("workspaces")
    if "accent_color" not in workspace_cols:
        op.add_column(
            "workspaces",
            sa.Column("accent_color", sa.String(length=20), nullable=False, server_default="#e86a17"),
        )
    if "brand_name" not in workspace_cols:
        op.add_column("workspaces", sa.Column("brand_name", sa.String(length=160), nullable=True))
    if "brand_tagline" not in workspace_cols:
        op.add_column("workspaces", sa.Column("brand_tagline", sa.String(length=255), nullable=True))

    sso_cols = _column_names("sso_configs")
    if "idp_entity_id" not in sso_cols:
        op.add_column("sso_configs", sa.Column("idp_entity_id", sa.String(length=500), nullable=True))
    if "idp_sso_url" not in sso_cols:
        op.add_column("sso_configs", sa.Column("idp_sso_url", sa.String(length=1000), nullable=True))
    if "idp_x509_cert" not in sso_cols:
        op.add_column("sso_configs", sa.Column("idp_x509_cert", sa.Text(), nullable=True))
    if "sp_entity_id" not in sso_cols:
        op.add_column("sso_configs", sa.Column("sp_entity_id", sa.String(length=500), nullable=True))

    project_cols = _column_names("projects")
    if "issue_type_scheme_id" not in project_cols:
        op.add_column(
            "projects",
            sa.Column("issue_type_scheme_id", sa.Uuid(as_uuid=True), nullable=True),
        )
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("projects")}
        if "ix_projects_issue_type_scheme_id" not in existing_indexes:
            op.create_index(
                "ix_projects_issue_type_scheme_id", "projects", ["issue_type_scheme_id"]
            )

    connection = op.get_bind()
    if connection.dialect.name != "sqlite":
        op.alter_column("workspaces", "accent_color", server_default=None)
        # Add FK where the dialect supports ALTER TABLE ADD CONSTRAINT.
        existing_fks = {fk["name"] for fk in sa.inspect(connection).get_foreign_keys("projects")}
        if "fk_projects_issue_type_scheme_id" not in existing_fks:
            op.create_foreign_key(
                "fk_projects_issue_type_scheme_id",
                "projects",
                "issue_type_schemes",
                ["issue_type_scheme_id"],
                ["id"],
                ondelete="SET NULL",
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if bind.dialect.name != "sqlite":
        existing_fks = {fk["name"] for fk in inspector.get_foreign_keys("projects")}
        if "fk_projects_issue_type_scheme_id" in existing_fks:
            op.drop_constraint("fk_projects_issue_type_scheme_id", "projects", type_="foreignkey")

    project_cols = _column_names("projects")
    if "issue_type_scheme_id" in project_cols:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("projects")}
        if "ix_projects_issue_type_scheme_id" in existing_indexes:
            op.drop_index("ix_projects_issue_type_scheme_id", table_name="projects")
        op.drop_column("projects", "issue_type_scheme_id")

    sso_cols = _column_names("sso_configs")
    for col in ("sp_entity_id", "idp_x509_cert", "idp_sso_url", "idp_entity_id"):
        if col in sso_cols:
            op.drop_column("sso_configs", col)

    workspace_cols = _column_names("workspaces")
    for col in ("brand_tagline", "brand_name", "accent_color"):
        if col in workspace_cols:
            op.drop_column("workspaces", col)

    tables_to_drop = [
        Base.metadata.tables[name]
        for name in reversed(
            [
                "workflow_transition_rules",
                "workspace_dns_providers",
                "workspace_domains",
                "email_templates",
                "workspace_smtp_settings",
                "issue_type_scheme_items",
                "issue_type_schemes",
            ]
        )
        if name in existing_tables and name in Base.metadata.tables
    ]
    if tables_to_drop:
        Base.metadata.drop_all(bind=bind, tables=tables_to_drop)
