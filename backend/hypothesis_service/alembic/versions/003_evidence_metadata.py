"""evidence.metadata JSONB for annotations and connector extras

Revision ID: h003
Revises: h002
Create Date: 2026-04-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "h003"
down_revision: Union[str, None] = "h002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "evidence",
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        schema="hypothesis",
    )


def downgrade() -> None:
    op.drop_column("evidence", "metadata", schema="hypothesis")
