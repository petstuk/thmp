"""sync_meta bundle version + technique name trigram index

Revision ID: a002
Revises: a001
Create Date: 2026-04-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a002"
down_revision: Union[str, None] = "a001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sync_meta",
        sa.Column("bundle_attack_version", sa.String(length=32), nullable=True),
        schema="attack",
    )
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_attack_techniques_name_trgm "
            "ON attack.techniques USING gin (name gin_trgm_ops)"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS attack.ix_attack_techniques_name_trgm"))
    op.drop_column("sync_meta", "bundle_attack_version", schema="attack")
