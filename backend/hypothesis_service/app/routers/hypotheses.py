from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_emit import emit_audit
from app.deps import get_db, get_workspace_context, require_writer
from app.fsm import assert_transition_allowed
from app.models import Hypothesis, HypothesisStatusEvent
from app.schemas import HypothesisCreate, HypothesisOut, HypothesisPatch, hypothesis_to_out
from thmp_common import TokenPayload

router = APIRouter(prefix="/hypotheses", tags=["hypotheses"])

TERMINAL = frozenset({"validated", "closed", "archived"})


@router.post("", response_model=HypothesisOut)
async def create_hypothesis(
    body: HypothesisCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> HypothesisOut:
    payload, workspace_id, role = ctx
    require_writer(role)
    owner = body.owner_id or payload.sub
    h = Hypothesis(
        title=body.title,
        description=body.description,
        status="draft",
        confidence_score=0.0,
        severity=body.severity,
        owner_id=owner,
        workspace_id=workspace_id,
        source_type=body.source_type,
        source_ref=body.source_ref,
        attack_technique_ids=body.attack_technique_ids,
        tags=body.tags,
        due_date=body.due_date,
        created_by=payload.sub,
        metadata_json=body.metadata,
    )
    db.add(h)
    await db.commit()
    await db.refresh(h)
    await emit_audit(
        action="hypothesis.create",
        entity_type="hypothesis",
        entity_id=h.id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"title": h.title, "status": h.status},
    )
    return hypothesis_to_out(h)


@router.get("", response_model=list[HypothesisOut])
async def list_hypotheses(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[HypothesisOut]:
    _, workspace_id, _role = ctx
    q = select(Hypothesis).where(Hypothesis.workspace_id == workspace_id).order_by(Hypothesis.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [hypothesis_to_out(h) for h in rows]


@router.get("/{hypothesis_id}", response_model=HypothesisOut)
async def get_hypothesis(
    hypothesis_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> HypothesisOut:
    _, workspace_id, _ = ctx
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")
    return hypothesis_to_out(h)


@router.patch("/{hypothesis_id}", response_model=HypothesisOut)
async def patch_hypothesis(
    hypothesis_id: UUID,
    body: HypothesisPatch,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> HypothesisOut:
    payload, workspace_id, role = ctx
    require_writer(role)
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")

    before = {"status": h.status, "title": h.title}

    if body.status is not None and body.status != h.status:
        if not body.transition_comment or not body.transition_comment.strip():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "transition_comment required for status change")
        try:
            assert_transition_allowed(h.status, body.status, role)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
        db.add(
            HypothesisStatusEvent(
                hypothesis_id=h.id,
                from_status=h.status,
                to_status=body.status,
                comment=body.transition_comment.strip(),
                user_id=payload.sub,
            )
        )
        h.status = body.status
        if body.status in TERMINAL:
            h.closed_at = datetime.now(tz=UTC)

    if body.title is not None:
        h.title = body.title
    if body.description is not None:
        h.description = body.description
    if body.severity is not None:
        h.severity = body.severity
    if body.owner_id is not None:
        h.owner_id = body.owner_id
    if body.source_ref is not None:
        h.source_ref = body.source_ref
    if body.attack_technique_ids is not None:
        h.attack_technique_ids = body.attack_technique_ids
    if body.tags is not None:
        h.tags = body.tags
    if body.due_date is not None:
        h.due_date = body.due_date
    if body.metadata is not None:
        h.metadata_json = body.metadata
    if body.confidence_score is not None:
        h.confidence_score = body.confidence_score

    await db.commit()
    await db.refresh(h)
    await emit_audit(
        action="hypothesis.update",
        entity_type="hypothesis",
        entity_id=h.id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"before": before, "after": {"status": h.status, "title": h.title}},
    )
    return hypothesis_to_out(h)


@router.delete("/{hypothesis_id}", status_code=204)
async def delete_hypothesis(
    hypothesis_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> None:
    payload, workspace_id, role = ctx
    if role not in {"manager", "admin"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")
    await db.execute(delete(Hypothesis).where(Hypothesis.id == hypothesis_id))
    await db.commit()
    await emit_audit(
        action="hypothesis.delete",
        entity_type="hypothesis",
        entity_id=hypothesis_id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={},
    )
