from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_emit import emit_audit
from app.deps import get_db, require_internal_token
from app.models import Hypothesis
from app.schemas import InternalHypothesisIngestItem, InternalIngestItemResult

router = APIRouter(prefix="/internal/hypotheses", tags=["internal"])


@router.post("/ingest-item", response_model=InternalIngestItemResult)
async def ingest_hypothesis_item(
    body: InternalHypothesisIngestItem,
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
) -> InternalIngestItemResult:
    dedupe_col = func.jsonb_extract_path_text(Hypothesis.source_ref, "ingest", "dedupe_key")
    existing = (
        await db.execute(
            select(Hypothesis.id)
            .where(
                Hypothesis.workspace_id == body.workspace_id,
                dedupe_col == body.dedupe_key,
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return InternalIngestItemResult(id=existing, created=False)

    merged_ref = dict(body.source_ref or {})
    merged_ref["ingest"] = {"dedupe_key": body.dedupe_key, "connector_id": body.connector_id}

    h = Hypothesis(
        title=body.title,
        description=body.description,
        status="draft",
        confidence_score=0.0,
        severity=body.severity,
        owner_id=body.created_by,
        workspace_id=body.workspace_id,
        source_type=body.source_type,
        source_ref=merged_ref,
        attack_technique_ids=None,
        tags=None,
        due_date=None,
        created_by=body.created_by,
        metadata_json=body.metadata,
    )
    db.add(h)
    await db.commit()
    await db.refresh(h)
    await emit_audit(
        action="hypothesis.ingest",
        entity_type="hypothesis",
        entity_id=h.id,
        actor_user_id=body.created_by,
        workspace_id=body.workspace_id,
        diff={"title": h.title, "status": h.status, "connector_id": body.connector_id},
    )
    return InternalIngestItemResult(id=h.id, created=True)
