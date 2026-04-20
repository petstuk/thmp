"""integration configs

Revision ID: 002
Revises: 001
Create Date: 2026-04-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "integration_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("auth.workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("connector_id", sa.String(64), nullable=False),
        sa.Column("name", sa.String(256), nullable=True),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("secret_ref", sa.String(512), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("workspace_id", "connector_id", name="uq_integration_workspace_connector"),
        schema="auth",
    )
    op.create_index(
        "ix_integration_configs_workspace_id",
        "integration_configs",
        ["workspace_id"],
        unique=False,
        schema="auth",
    )


def downgrade() -> None:
    op.drop_index("ix_integration_configs_workspace_id", table_name="integration_configs", schema="auth")
    op.drop_table("integration_configs", schema="auth")
