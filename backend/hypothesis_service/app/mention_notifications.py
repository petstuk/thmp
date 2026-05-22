from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AnalystNotification

_MENTION_UUID = re.compile(r"@([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})")
# Markdown-ish: @[Display Name](user:uuid)
_MENTION_TOKEN = re.compile(
    r"@\[[^\]]+\]\(user:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)"
)


def parse_mentioned_user_ids(body: str) -> set[UUID]:
    ids: set[UUID] = set()
    for m in _MENTION_UUID.finditer(body):
        ids.add(UUID(m.group(1)))
    for m in _MENTION_TOKEN.finditer(body):
        ids.add(UUID(m.group(1)))
    return ids


async def notify_mentions(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    body: str,
    message_prefix: str,
    ref_type: str,
    ref_id: UUID,
    exclude_user_id: UUID,
) -> None:
    for uid in parse_mentioned_user_ids(body):
        if uid == exclude_user_id:
            continue
        db.add(
            AnalystNotification(
                workspace_id=workspace_id,
                user_id=uid,
                kind="mention",
                message=f"{message_prefix}: {body[:500]}{'…' if len(body) > 500 else ''}",
                ref_type=ref_type,
                ref_id=ref_id,
            )
        )
