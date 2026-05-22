from __future__ import annotations

import os
from typing import Any
from uuid import UUID

import httpx


async def emit_audit(
    *,
    action: str,
    entity_type: str,
    entity_id: UUID,
    actor_user_id: UUID | None,
    workspace_id: UUID | None,
    diff: dict[str, Any],
    request_id: str | None = None,
) -> None:
    base = os.environ.get("AUDIT_SERVICE_URL")
    secret = os.environ.get("THMP_INTERNAL_API_SECRET", "")
    if not base or not secret:
        return
    url = f"{base.rstrip('/')}/api/v1/audit/internal/events"
    payload = {
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "actor_user_id": str(actor_user_id) if actor_user_id else None,
        "workspace_id": str(workspace_id) if workspace_id else None,
        "diff": diff,
        "request_id": request_id,
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(url, json=payload, headers={"X-Internal-Token": secret})
    except httpx.HTTPError:
        return
