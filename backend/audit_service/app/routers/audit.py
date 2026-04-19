from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_audit_admin, require_internal_token
from app.models import AuditLog
from app.schemas import AuditEventOut, InternalAuditEvent

router = APIRouter(prefix="/audit", tags=["audit"])


@router.post("/internal/events", status_code=204)
async def ingest_internal(
    body: InternalAuditEvent,
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
) -> None:
    row = AuditLog(
        id=uuid.uuid4(),
        actor_user_id=body.actor_user_id,
        actor_ip=body.actor_ip,
        action=body.action,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        workspace_id=body.workspace_id,
        diff=body.diff,
        request_id=body.request_id,
    )
    db.add(row)
    await db.commit()


@router.get("/events", response_model=list[AuditEventOut])
async def list_events(
    _: None = Depends(require_audit_admin),
    db: AsyncSession = Depends(get_db),
    workspace_id: Annotated[UUID | None, Query()] = None,
    limit: Annotated[int, Query(le=500)] = 100,
) -> list[AuditLog]:
    q = select(AuditLog).order_by(AuditLog.occurred_at.desc()).limit(limit)
    if workspace_id is not None:
        q = q.where(AuditLog.workspace_id == workspace_id)
    rows = (await db.execute(q)).scalars().all()
    return list(rows)
