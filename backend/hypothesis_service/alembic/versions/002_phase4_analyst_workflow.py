"""phase 4 analyst workflow: hunts timeline, comments, evidence extensions, scoring, kanban, notifications

Revision ID: h002
Revises: h001
Create Date: 2026-04-20

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "h002"
down_revision: Union[str, None] = "h001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "hunt_timeline_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "hunt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hypothesis.hunts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="hypothesis",
    )
    op.create_index(
        "ix_hunt_timeline_hunt_id",
        "hunt_timeline_events",
        ["hunt_id"],
        schema="hypothesis",
    )

    op.add_column(
        "hypotheses",
        sa.Column("analyst_confidence_1_5", sa.SmallInteger(), nullable=True),
        schema="hypothesis",
    )
    op.add_column(
        "hypotheses",
        sa.Column("signal_strength_0_1", sa.Float(), nullable=True),
        schema="hypothesis",
    )

    op.create_table(
        "hypothesis_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "hypothesis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hypothesis.hypotheses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hypothesis.hypothesis_comments.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="hypothesis",
    )
    op.create_index(
        "ix_hypothesis_comments_hypothesis_id",
        "hypothesis_comments",
        ["hypothesis_id"],
        schema="hypothesis",
    )

    op.create_table(
        "analyst_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("ref_type", sa.String(32), nullable=True),
        sa.Column("ref_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="hypothesis",
    )
    op.create_index(
        "ix_analyst_notifications_user_ws",
        "analyst_notifications",
        ["user_id", "workspace_id"],
        schema="hypothesis",
    )

    op.create_table(
        "workspace_scoring_settings",
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "weights",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default='{"analyst": 0.4, "evidence": 0.4, "signal": 0.2}',
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="hypothesis",
    )

    op.create_table(
        "kanban_view_presets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("filters", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        schema="hypothesis",
    )
    op.create_index(
        "ix_kanban_presets_ws_user",
        "kanban_view_presets",
        ["workspace_id", "user_id"],
        schema="hypothesis",
    )

    op.add_column(
        "evidence",
        sa.Column(
            "previous_evidence_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hypothesis.evidence.id", ondelete="SET NULL"),
            nullable=True,
        ),
        schema="hypothesis",
    )
    op.add_column("evidence", sa.Column("siem_vendor", sa.String(64), nullable=True), schema="hypothesis")
    op.add_column("evidence", sa.Column("siem_query_url", sa.String(2048), nullable=True), schema="hypothesis")
    op.add_column("evidence", sa.Column("siem_query_text", sa.Text(), nullable=True), schema="hypothesis")


def downgrade() -> None:
    op.drop_column("evidence", "siem_query_text", schema="hypothesis")
    op.drop_column("evidence", "siem_query_url", schema="hypothesis")
    op.drop_column("evidence", "siem_vendor", schema="hypothesis")
    op.drop_column("evidence", "previous_evidence_id", schema="hypothesis")
    op.drop_index("ix_kanban_presets_ws_user", table_name="kanban_view_presets", schema="hypothesis")
    op.drop_table("kanban_view_presets", schema="hypothesis")
    op.drop_table("workspace_scoring_settings", schema="hypothesis")
    op.drop_index("ix_analyst_notifications_user_ws", table_name="analyst_notifications", schema="hypothesis")
    op.drop_table("analyst_notifications", schema="hypothesis")
    op.drop_index("ix_hypothesis_comments_hypothesis_id", table_name="hypothesis_comments", schema="hypothesis")
    op.drop_table("hypothesis_comments", schema="hypothesis")
    op.drop_column("hypotheses", "signal_strength_0_1", schema="hypothesis")
    op.drop_column("hypotheses", "analyst_confidence_1_5", schema="hypothesis")
    op.drop_index("ix_hunt_timeline_hunt_id", table_name="hunt_timeline_events", schema="hypothesis")
    op.drop_table("hunt_timeline_events", schema="hypothesis")
