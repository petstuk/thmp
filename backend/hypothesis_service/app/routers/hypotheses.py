from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attack_validate import ensure_technique_ids_exist
from app.audit_emit import emit_audit
from app.concurrency import normalize_if_match, updated_at_matches_row
from app.deps import get_db, get_workspace_context, require_writer
from app.fsm import assert_transition_allowed
from app.mention_notifications import notify_mentions
from app.models import Evidence, Hunt, Hypothesis, HypothesisComment, HypothesisStatusEvent
from app.schemas import (
    ActivityItemOut,
    HypothesisCommentCreate,
    HypothesisCommentOut,
    HypothesisCommentPatch,
    HypothesisCreate,
    HypothesisOut,
    HypothesisPatch,
    hypothesis_to_out,
)
from app.scoring import recompute_hypothesis_confidence
from app.search import index_hypothesis
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
    await ensure_technique_ids_exist(body.attack_technique_ids)
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
    index_hypothesis(h, workspace_id=str(workspace_id))
    return hypothesis_to_out(h)


@router.get("", response_model=list[HypothesisOut])
async def list_hypotheses(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
    filter_status: str | None = Query(default=None, alias="status"),
    source_type: str | None = Query(default=None),
    triage_queue: bool = Query(default=False),
    integration_queue: bool = Query(default=False),
    ingest_triage: Literal["auto", "review"] | None = Query(default=None),
    owner_id: UUID | None = Query(default=None),
    severity: str | None = Query(default=None),
    hunt_id: UUID | None = Query(default=None),
    created_after: datetime | None = Query(default=None),
    created_before: datetime | None = Query(default=None),
) -> list[HypothesisOut]:
    _, workspace_id, _role = ctx
    q = select(Hypothesis).where(Hypothesis.workspace_id == workspace_id)
    if integration_queue:
        q = q.where(Hypothesis.status == "draft", Hypothesis.source_type == "integration")
        if ingest_triage is not None:
            thresh = float(os.environ.get("THMP_INGEST_AUTO_CONFIDENCE_MIN", "0.7"))
            if ingest_triage == "auto":
                q = q.where(Hypothesis.confidence_score >= thresh)
            else:
                q = q.where(Hypothesis.confidence_score < thresh)
    elif triage_queue:
        q = q.where(Hypothesis.status == "draft", Hypothesis.source_type != "manual")
    else:
        if filter_status is not None:
            q = q.where(Hypothesis.status == filter_status)
        if source_type is not None:
            q = q.where(Hypothesis.source_type == source_type)
        if owner_id is not None:
            q = q.where(Hypothesis.owner_id == owner_id)
        if severity is not None:
            q = q.where(Hypothesis.severity == severity)
        if created_after is not None:
            q = q.where(Hypothesis.created_at >= created_after)
        if created_before is not None:
            q = q.where(Hypothesis.created_at <= created_before)
        if hunt_id is not None:
            hunt = (await db.execute(select(Hunt).where(Hunt.id == hunt_id))).scalar_one_or_none()
            if not hunt or hunt.workspace_id != workspace_id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Hunt not found")
            hid = hunt.hypothesis_ids or []
            if not hid:
                return []
            q = q.where(Hypothesis.id.in_(hid))

    q = q.order_by(Hypothesis.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [hypothesis_to_out(h) for h in rows]


@router.get("/{hypothesis_id}/activity", response_model=list[ActivityItemOut])
async def hypothesis_activity(
    hypothesis_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[ActivityItemOut]:
    _, workspace_id, _ = ctx
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")

    items: list[ActivityItemOut] = []

    ev_rows = (
        await db.execute(
            select(HypothesisStatusEvent)
            .where(HypothesisStatusEvent.hypothesis_id == hypothesis_id)
            .order_by(HypothesisStatusEvent.created_at.asc())
        )
    ).scalars().all()
    for ev in ev_rows:
        summary = f"{ev.from_status or '∅'} → {ev.to_status}"
        items.append(
            ActivityItemOut(
                id=ev.id,
                occurred_at=ev.created_at,
                kind="status_change",
                summary=summary,
                actor_id=ev.user_id,
                detail=ev.comment,
            )
        )

    evidence_rows = (
        await db.execute(
            select(Evidence)
            .where(Evidence.hypothesis_id == hypothesis_id)
            .order_by(Evidence.created_at.asc())
        )
    ).scalars().all()
    for ev in evidence_rows:
        items.append(
            ActivityItemOut(
                id=ev.id,
                occurred_at=ev.created_at,
                kind="evidence",
                summary=f"Evidence added: {ev.title}",
                actor_id=ev.submitted_by,
                detail=ev.type,
            )
        )

    comments = (
        await db.execute(
            select(HypothesisComment)
            .where(HypothesisComment.hypothesis_id == hypothesis_id)
            .order_by(HypothesisComment.created_at.asc())
        )
    ).scalars().all()
    for c in comments:
        items.append(
            ActivityItemOut(
                id=c.id,
                occurred_at=c.created_at,
                kind="comment",
                summary="Comment",
                actor_id=c.author_id,
                detail=c.body[:2000],
            )
        )

    items.sort(key=lambda x: x.occurred_at)
    return items


@router.get("/{hypothesis_id}/comments", response_model=list[HypothesisCommentOut])
async def list_hypothesis_comments(
    hypothesis_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[HypothesisComment]:
    _, workspace_id, _ = ctx
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")
    q = (
        select(HypothesisComment)
        .where(HypothesisComment.hypothesis_id == hypothesis_id)
        .order_by(HypothesisComment.created_at.asc())
    )
    return list((await db.execute(q)).scalars().all())


@router.post("/{hypothesis_id}/comments", response_model=HypothesisCommentOut)
async def create_hypothesis_comment(
    hypothesis_id: UUID,
    body: HypothesisCommentCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> HypothesisComment:
    payload, workspace_id, role = ctx
    require_writer(role)
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")
    if body.parent_id is not None:
        parent = (
            await db.execute(
                select(HypothesisComment).where(
                    HypothesisComment.id == body.parent_id,
                    HypothesisComment.hypothesis_id == hypothesis_id,
                )
            )
        ).scalar_one_or_none()
        if not parent:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid parent comment")

    c = HypothesisComment(
        hypothesis_id=hypothesis_id,
        parent_id=body.parent_id,
        body=body.body.strip(),
        author_id=payload.sub,
    )
    db.add(c)
    await db.flush()
    await notify_mentions(
        db,
        workspace_id=workspace_id,
        body=body.body,
        message_prefix=f"You were mentioned on hypothesis «{h.title}»",
        ref_type="hypothesis",
        ref_id=hypothesis_id,
        exclude_user_id=payload.sub,
    )
    await db.commit()
    await db.refresh(c)
    await emit_audit(
        action="hypothesis.comment.create",
        entity_type="hypothesis",
        entity_id=hypothesis_id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"comment_id": str(c.id)},
    )
    return c


@router.patch("/{hypothesis_id}/comments/{comment_id}", response_model=HypothesisCommentOut)
async def patch_hypothesis_comment(
    hypothesis_id: UUID,
    comment_id: UUID,
    body: HypothesisCommentPatch,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> HypothesisComment:
    payload, workspace_id, role = ctx
    require_writer(role)
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")
    c = (
        await db.execute(
            select(HypothesisComment).where(
                HypothesisComment.id == comment_id,
                HypothesisComment.hypothesis_id == hypothesis_id,
            )
        )
    ).scalar_one_or_none()
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    now = datetime.now(tz=timezone.utc)
    if c.author_id != payload.sub:
        if role not in {"manager", "admin"}:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author or a manager can edit this comment")
    else:
        created = c.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if now - created > timedelta(minutes=15) and role not in {"manager", "admin"}:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Edit window (15 minutes) has expired")
    c.body = body.body.strip()
    await db.commit()
    await db.refresh(c)
    await emit_audit(
        action="hypothesis.comment.update",
        entity_type="hypothesis",
        entity_id=hypothesis_id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"comment_id": str(c.id)},
    )
    return c


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
    if_match: Annotated[str | None, Header(alias="If-Match")] = None,
) -> HypothesisOut:
    payload, workspace_id, role = ctx
    require_writer(role)
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")

    norm = normalize_if_match(if_match)
    if not updated_at_matches_row(h.updated_at, norm):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={
                "error": "conflict",
                "message": "Hypothesis was modified; refresh and retry",
                "current": hypothesis_to_out(h).model_dump(mode="json"),
            },
        )

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
            h.closed_at = datetime.now(tz=timezone.utc)

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
        await ensure_technique_ids_exist(body.attack_technique_ids)
        h.attack_technique_ids = body.attack_technique_ids
    if body.tags is not None:
        h.tags = body.tags
    if body.due_date is not None:
        h.due_date = body.due_date
    if body.metadata is not None:
        h.metadata_json = body.metadata
    if body.confidence_score is not None:
        h.confidence_score = body.confidence_score
    if body.analyst_confidence_1_5 is not None:
        h.analyst_confidence_1_5 = body.analyst_confidence_1_5
    if body.signal_strength_0_1 is not None:
        h.signal_strength_0_1 = body.signal_strength_0_1

    await db.commit()
    await db.refresh(h)

    manual_score = body.confidence_score is not None
    if not manual_score and not body.skip_scoring_recompute:
        await recompute_hypothesis_confidence(db, h)
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
    index_hypothesis(h, workspace_id=str(workspace_id))
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
