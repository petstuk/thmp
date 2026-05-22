from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_emit import emit_audit
from app.concurrency import normalize_if_match, updated_at_matches_row
from app.deps import get_db, get_workspace_context, require_writer
from app.hunt_fsm import assert_hunt_transition_allowed
from app.models import Finding, Hunt, HuntTimelineEvent, Hypothesis
from app.schemas import (
    FindingCreate,
    FindingOut,
    HuntCreate,
    HuntOut,
    HuntPatch,
    HuntTimelineEventOut,
    HuntTimelineNoteCreate,
    hunt_timeline_to_out,
)
from thmp_common import TokenPayload

router = APIRouter(prefix="/hunts", tags=["hunts"])


async def _get_hunt(
    db: AsyncSession, hunt_id: UUID, workspace_id: UUID
) -> Hunt:
    hunt = (await db.execute(select(Hunt).where(Hunt.id == hunt_id))).scalar_one_or_none()
    if not hunt or hunt.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hunt not found")
    return hunt


async def _validate_hypothesis_ids(
    db: AsyncSession, workspace_id: UUID, ids: list[UUID] | None
) -> None:
    if not ids:
        return
    for hid in ids:
        h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hid))).scalar_one_or_none()
        if not h or h.workspace_id != workspace_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Hypothesis {hid} not in workspace")


@router.post("", response_model=HuntOut)
async def create_hunt(
    body: HuntCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> Hunt:
    payload, workspace_id, role = ctx
    require_writer(role)
    await _validate_hypothesis_ids(db, workspace_id, body.hypothesis_ids)
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
    db.add(
        HuntTimelineEvent(
            hunt_id=hunt.id,
            event_type="hunt.created",
            message=f"Hunt «{hunt.name}» created",
            user_id=payload.sub,
            metadata_json={"status": hunt.status},
        )
    )
    await db.commit()
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
    hunt_row = await _get_hunt(db, body.hunt_id, workspace_id)
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
    db.add(
        HuntTimelineEvent(
            hunt_id=hunt_row.id,
            event_type="finding.created",
            message=f"Finding recorded: {f.title}",
            user_id=payload.sub,
            metadata_json={"finding_id": str(f.id)},
        )
    )
    await db.commit()
    return f


@router.get("/findings", response_model=list[FindingOut])
async def list_findings(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[Finding]:
    _, workspace_id, _ = ctx
    q = select(Finding).where(Finding.workspace_id == workspace_id).order_by(Finding.created_at.desc())
    return list((await db.execute(q)).scalars().all())


@router.get("/{hunt_id}/timeline", response_model=list[HuntTimelineEventOut])
async def list_hunt_timeline(
    hunt_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[HuntTimelineEventOut]:
    _, workspace_id, _ = ctx
    await _get_hunt(db, hunt_id, workspace_id)
    q = (
        select(HuntTimelineEvent)
        .where(HuntTimelineEvent.hunt_id == hunt_id)
        .order_by(HuntTimelineEvent.created_at.asc())
    )
    rows = list((await db.execute(q)).scalars().all())
    return [hunt_timeline_to_out(e) for e in rows]


@router.post("/{hunt_id}/timeline", response_model=HuntTimelineEventOut)
async def add_hunt_timeline_note(
    hunt_id: UUID,
    body: HuntTimelineNoteCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> HuntTimelineEventOut:
    payload, workspace_id, role = ctx
    require_writer(role)
    await _get_hunt(db, hunt_id, workspace_id)
    ev = HuntTimelineEvent(
        hunt_id=hunt_id,
        event_type="note",
        message=body.body.strip(),
        user_id=payload.sub,
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return hunt_timeline_to_out(ev)


@router.get("/{hunt_id}", response_model=HuntOut)
async def get_hunt(
    hunt_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> Hunt:
    _, workspace_id, _ = ctx
    return await _get_hunt(db, hunt_id, workspace_id)


@router.patch("/{hunt_id}", response_model=HuntOut)
async def patch_hunt(
    hunt_id: UUID,
    body: HuntPatch,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
    if_match: Annotated[str | None, Header(alias="If-Match")] = None,
) -> Hunt:
    payload, workspace_id, role = ctx
    require_writer(role)
    hunt = await _get_hunt(db, hunt_id, workspace_id)
    norm = normalize_if_match(if_match)
    if not updated_at_matches_row(hunt.updated_at, norm):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={
                "error": "conflict",
                "message": "Hunt was modified; refresh and retry",
                "current": HuntOut.model_validate(hunt).model_dump(mode="json"),
            },
        )

    if body.hypothesis_ids is not None:
        await _validate_hypothesis_ids(db, workspace_id, body.hypothesis_ids)

    if body.status is not None and body.status != hunt.status:
        if not body.transition_comment or not body.transition_comment.strip():
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "transition_comment required for hunt status change",
            )
        try:
            assert_hunt_transition_allowed(hunt.status, body.status, role)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
        db.add(
            HuntTimelineEvent(
                hunt_id=hunt.id,
                event_type="status_change",
                message=body.transition_comment.strip(),
                user_id=payload.sub,
                metadata_json={"from_status": hunt.status, "to_status": body.status},
            )
        )
        hunt.status = body.status

    if body.name is not None:
        hunt.name = body.name
    if body.description is not None:
        hunt.description = body.description
    if body.lead_id is not None:
        hunt.lead_id = body.lead_id
    if body.assigned_analyst_ids is not None:
        hunt.assigned_analyst_ids = body.assigned_analyst_ids
    if body.hypothesis_ids is not None:
        hunt.hypothesis_ids = body.hypothesis_ids
    if body.start_date is not None:
        hunt.start_date = body.start_date
    if body.end_date is not None:
        hunt.end_date = body.end_date

    if body.timeline_note and body.timeline_note.strip():
        db.add(
            HuntTimelineEvent(
                hunt_id=hunt.id,
                event_type="note",
                message=body.timeline_note.strip(),
                user_id=payload.sub,
            )
        )

    await db.commit()
    await db.refresh(hunt)
    await emit_audit(
        action="hunt.update",
        entity_type="hunt",
        entity_id=hunt.id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"status": hunt.status, "name": hunt.name},
    )
    return hunt


@router.delete("/{hunt_id}", status_code=204)
async def delete_hunt(
    hunt_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> None:
    payload, workspace_id, role = ctx
    if role not in {"manager", "admin"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
    hunt = await _get_hunt(db, hunt_id, workspace_id)
    await db.execute(delete(Hunt).where(Hunt.id == hunt.id))
    await db.commit()
    await emit_audit(
        action="hunt.delete",
        entity_type="hunt",
        entity_id=hunt_id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={},
    )
