"""initial auth schema

Revision ID: 001
Revises:
Create Date: 2026-04-19

"""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS auth")
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False, unique=True),
        sa.Column("description", sa.String(512), nullable=True),
        schema="auth",
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("password_hash", sa.String(256), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="auth",
    )
    op.create_table(
        "workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("slug", sa.String(128), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="auth",
    )
    op.create_table(
        "workspace_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("auth.workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("auth.roles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "workspace_id", name="uq_membership_user_workspace"),
        schema="auth",
    )
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("jti", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="auth",
    )

    roles_table = sa.table(
        "roles",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String(64)),
        sa.column("description", sa.String(512)),
        schema="auth",
    )
    op.bulk_insert(
        roles_table,
        [
            {"id": uuid.uuid4(), "name": "analyst", "description": "Analyst"},
            {"id": uuid.uuid4(), "name": "hunt_lead", "description": "Hunt lead"},
            {"id": uuid.uuid4(), "name": "ti_analyst", "description": "TI analyst"},
            {"id": uuid.uuid4(), "name": "manager", "description": "Manager"},
            {"id": uuid.uuid4(), "name": "admin", "description": "Admin"},
            {"id": uuid.uuid4(), "name": "read_only", "description": "Read only"},
        ],
    )


def downgrade() -> None:
    op.drop_table("refresh_tokens", schema="auth")
    op.drop_table("workspace_memberships", schema="auth")
    op.drop_table("workspaces", schema="auth")
    op.drop_table("users", schema="auth")
    op.drop_table("roles", schema="auth")
    op.execute("DROP SCHEMA IF EXISTS auth CASCADE")
