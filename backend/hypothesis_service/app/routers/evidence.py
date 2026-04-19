from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_emit import emit_audit
from app.deps import get_db, get_workspace_context, require_writer
from app.models import Evidence, Hypothesis
from app.schemas import EvidenceCreate, EvidenceOut
from thmp_common import TokenPayload

router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.post("", response_model=EvidenceOut)
async def create_evidence(
    body: EvidenceCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> Evidence:
    payload, workspace_id, role = ctx
    require_writer(role)
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == body.hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")
    ev = Evidence(
        hypothesis_id=body.hypothesis_id,
        type=body.type,
        title=body.title,
        content=body.content,
        storage_key=body.storage_key,
        mime_type=body.mime_type,
        iocs=body.iocs,
        supports_hypothesis=body.supports_hypothesis,
        weight=body.weight,
        version=1,
        submitted_by=payload.sub,
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    await emit_audit(
        action="evidence.create",
        entity_type="evidence",
        entity_id=ev.id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"hypothesis_id": str(body.hypothesis_id), "type": body.type},
    )
    return ev


@router.get("", response_model=list[EvidenceOut])
async def list_evidence(
    hypothesis_id: UUID = Query(...),
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[Evidence]:
    _, workspace_id, _ = ctx
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")
    q = select(Evidence).where(Evidence.hypothesis_id == hypothesis_id).order_by(Evidence.created_at.desc())
    return list((await db.execute(q)).scalars().all())
