"""initial attack schema

Revision ID: a001
Revises:
Create Date: 2026-04-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS attack")
    op.create_table(
        "sync_meta",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_url", sa.String(length=1024), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        schema="attack",
    )
    op.create_table(
        "tactics",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stix_id", sa.String(length=256), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("short_name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stix_id"),
        schema="attack",
    )
    op.create_table(
        "techniques",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stix_id", sa.String(length=256), nullable=False),
        sa.Column("mitre_id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("is_subtechnique", sa.Boolean(), nullable=False),
        sa.Column("parent_technique_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("platforms", postgresql.ARRAY(sa.String(length=128)), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(
            ["parent_technique_id"],
            ["attack.techniques.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stix_id"),
        sa.UniqueConstraint("mitre_id"),
        schema="attack",
    )
    op.create_index(
        "ix_attack_techniques_mitre_id", "techniques", ["mitre_id"], unique=False, schema="attack"
    )
    op.create_table(
        "technique_tactics",
        sa.Column("technique_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tactic_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["tactic_id"], ["attack.tactics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["technique_id"], ["attack.techniques.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("technique_id", "tactic_id"),
        schema="attack",
    )


def downgrade() -> None:
    op.drop_table("technique_tactics", schema="attack")
    op.drop_table("techniques", schema="attack")
    op.drop_table("tactics", schema="attack")
    op.drop_table("sync_meta", schema="attack")
    op.execute("DROP SCHEMA IF EXISTS attack CASCADE")
