"""initial hypothesis schema

Revision ID: h001
Revises:
Create Date: 2026-04-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "h001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS hypothesis")
    op.create_table(
        "hypotheses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("severity", sa.String(32), nullable=False, server_default="medium"),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_type", sa.String(32), nullable=False, server_default="manual"),
        sa.Column("source_ref", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("attack_technique_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String(128)), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        schema="hypothesis",
    )
    op.create_table(
        "hypothesis_status_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("hypothesis_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hypothesis.hypotheses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", sa.String(32), nullable=True),
        sa.Column("to_status", sa.String(32), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="hypothesis",
    )
    op.create_table(
        "hunts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="planned"),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_analyst_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("hypothesis_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="hypothesis",
    )
    op.create_table(
        "evidence",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("hypothesis_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hypothesis.hypotheses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("storage_key", sa.String(1024), nullable=True),
        sa.Column("mime_type", sa.String(256), nullable=True),
        sa.Column("iocs", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("supports_hypothesis", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("weight", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="hypothesis",
    )
    op.create_table(
        "findings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("hunt_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hypothesis.hunts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hypothesis_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("narrative", sa.Text(), nullable=False),
        sa.Column("outcome", sa.String(32), nullable=False),
        sa.Column("recommended_actions", sa.Text(), nullable=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="hypothesis",
    )


def downgrade() -> None:
    op.drop_table("findings", schema="hypothesis")
    op.drop_table("evidence", schema="hypothesis")
    op.drop_table("hunts", schema="hypothesis")
    op.drop_table("hypothesis_status_events", schema="hypothesis")
    op.drop_table("hypotheses", schema="hypothesis")
    op.execute("DROP SCHEMA IF EXISTS hypothesis CASCADE")
