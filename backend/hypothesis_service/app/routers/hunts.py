from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_emit import emit_audit
from app.deps import get_db, get_workspace_context, require_writer
from app.models import Finding, Hunt
from app.schemas import FindingCreate, FindingOut, HuntCreate, HuntOut
from thmp_common import TokenPayload

router = APIRouter(prefix="/hunts", tags=["hunts"])


@router.post("", response_model=HuntOut)
async def create_hunt(
    body: HuntCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> Hunt:
    payload, workspace_id, role = ctx
    require_writer(role)
    hunt = Hunt(
        name=body.name,
        description=body.description,
        status="planned",
        lead_id=body.lead_id,
        assigned_analyst_ids=body.assigned_analyst_ids,
        hypothesis_ids=body.hypothesis_ids,
        start_date=body.start_date,
        end_date=body.end_date,
        workspace_id=workspace_id,
    )
    db.add(hunt)
    await db.commit()
    await db.refresh(hunt)
    await emit_audit(
        action="hunt.create",
        entity_type="hunt",
        entity_id=hunt.id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"name": hunt.name},
    )
    return hunt


@router.get("", response_model=list[HuntOut])
async def list_hunts(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[Hunt]:
    _, workspace_id, _ = ctx
    q = select(Hunt).where(Hunt.workspace_id == workspace_id).order_by(Hunt.created_at.desc())
    return list((await db.execute(q)).scalars().all())


@router.post("/findings", response_model=FindingOut)
async def create_finding(
    body: FindingCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> Finding:
    payload, workspace_id, role = ctx
    require_writer(role)
    hunt = (await db.execute(select(Hunt).where(Hunt.id == body.hunt_id))).scalar_one_or_none()
    if not hunt or hunt.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hunt not found")
    f = Finding(
        hunt_id=body.hunt_id,
        hypothesis_ids=body.hypothesis_ids,
        title=body.title,
        narrative=body.narrative,
        outcome=body.outcome,
        recommended_actions=body.recommended_actions,
        workspace_id=workspace_id,
        created_by=payload.sub,
    )
    db.add(f)
    await db.commit()
    await db.refresh(f)
    await emit_audit(
        action="finding.create",
        entity_type="finding",
        entity_id=f.id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"hunt_id": str(body.hunt_id)},
    )
    return f


@router.get("/findings", response_model=list[FindingOut])
async def list_findings(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[Finding]:
    _, workspace_id, _ = ctx
    q = select(Finding).where(Finding.workspace_id == workspace_id).order_by(Finding.created_at.desc())
    return list((await db.execute(q)).scalars().all())
