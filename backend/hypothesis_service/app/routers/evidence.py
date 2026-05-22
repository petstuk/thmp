from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_emit import emit_audit
from app.deps import get_db, get_workspace_context, require_writer
from app.file_storage import _use_s3, file_path_for_storage_key, get_file_stream, save_uploaded_file
from app.ioc_extract import extract_iocs_from_text
from app.models import Evidence, Hypothesis
from app.schemas import EvidenceCreate, EvidenceHubOut, EvidenceOut
from app.scoring import recompute_hypothesis_confidence
from app.search import index_evidence
from thmp_common import TokenPayload

router = APIRouter(prefix="/evidence", tags=["evidence"])


def _merge_iocs(manual: list[dict] | None, extracted: list[dict]) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    out: list[dict] = []
    for src in (manual or []) + extracted:
        t = str(src.get("type", ""))
        v = str(src.get("value", ""))
        key = (t.lower(), v.lower())
        if not v or key in seen:
            continue
        seen.add(key)
        out.append({"type": t, "value": v})
    return out


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

    version = 1
    previous_evidence_id = body.previous_evidence_id
    if body.previous_evidence_id is not None:
        prev = (
            await db.execute(select(Evidence).where(Evidence.id == body.previous_evidence_id))
        ).scalar_one_or_none()
        if not prev or prev.hypothesis_id != body.hypothesis_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid previous_evidence_id")
        version = prev.version + 1

    extracted: list[dict] = []
    if body.auto_extract_iocs and body.content:
        extracted = extract_iocs_from_text(body.content)
    iocs = _merge_iocs(body.iocs, extracted)

    ev = Evidence(
        hypothesis_id=body.hypothesis_id,
        type=body.type,
        title=body.title,
        content=body.content,
        storage_key=body.storage_key,
        mime_type=body.mime_type,
        iocs=iocs or None,
        supports_hypothesis=body.supports_hypothesis,
        weight=body.weight,
        version=version,
        submitted_by=payload.sub,
        previous_evidence_id=previous_evidence_id,
        siem_vendor=body.siem_vendor,
        siem_query_url=body.siem_query_url,
        siem_query_text=body.siem_query_text,
        meta=body.metadata,
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    await recompute_hypothesis_confidence(db, h)
    await db.commit()
    await db.refresh(h)
    await emit_audit(
        action="evidence.create",
        entity_type="evidence",
        entity_id=ev.id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"hypothesis_id": str(body.hypothesis_id), "type": body.type},
    )
    index_evidence(ev, workspace_id=str(workspace_id))
    return ev


@router.post("/upload", response_model=EvidenceOut)
async def upload_evidence_file(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
    hypothesis_id: UUID = Form(),
    title: str = Form(),
    supports_hypothesis: bool = Form(default=True),
    weight: float = Form(default=0.5),
    metadata_json: str | None = Form(default=None),
    file: UploadFile = File(...),
) -> Evidence:
    payload, workspace_id, role = ctx
    require_writer(role)
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hypothesis not found")
    raw = await file.read()
    if len(raw) > 50 * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File too large (max 50MB)")
    meta: dict | None = None
    if metadata_json and metadata_json.strip():
        try:
            parsed = json.loads(metadata_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "metadata_json must be valid JSON") from exc
        if not isinstance(parsed, dict):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "metadata_json must be a JSON object")
        meta = parsed
    storage_key, mime = await save_uploaded_file(workspace_id, file.filename or "upload", raw, file.content_type)
    mime_type = file.content_type or mime
    ev = Evidence(
        hypothesis_id=hypothesis_id,
        type="file",
        title=title,
        content=None,
        storage_key=storage_key,
        mime_type=mime_type,
        iocs=None,
        supports_hypothesis=supports_hypothesis,
        weight=max(0.0, min(1.0, weight)),
        version=1,
        submitted_by=payload.sub,
        meta=meta,
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    await recompute_hypothesis_confidence(db, h)
    await db.commit()
    await db.refresh(h)
    await emit_audit(
        action="evidence.upload",
        entity_type="evidence",
        entity_id=ev.id,
        actor_user_id=payload.sub,
        workspace_id=workspace_id,
        diff={"hypothesis_id": str(hypothesis_id)},
    )
    index_evidence(ev, workspace_id=str(workspace_id))
    return ev


@router.get("/{evidence_id}/file", response_model=None)
async def download_evidence_file(
    evidence_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse | FileResponse:
    _, workspace_id, _ = ctx
    ev = (await db.execute(select(Evidence).where(Evidence.id == evidence_id))).scalar_one_or_none()
    if not ev or not ev.storage_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence file not found")
    h = (await db.execute(select(Hypothesis).where(Hypothesis.id == ev.hypothesis_id))).scalar_one_or_none()
    if not h or h.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence file not found")
    if _use_s3():
        try:
            stream, mime, size = await get_file_stream(ev.storage_key)
        except (FileNotFoundError, Exception) as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found in object store") from exc
        headers: dict[str, str] = {}
        if size is not None:
            headers["Content-Length"] = str(size)
        return StreamingResponse(
            stream,
            media_type=ev.mime_type or mime or "application/octet-stream",
            headers=headers,
        )
    # Local fallback (dev / tests without S3)
    try:
        path = file_path_for_storage_key(ev.storage_key)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid file reference") from exc
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File missing on disk")
    return FileResponse(
        path=path,
        media_type=ev.mime_type or "application/octet-stream",
        filename=path.name,
    )


@router.get("/hub", response_model=list[EvidenceHubOut])
async def list_evidence_hub(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
    ev_type: str | None = Query(default=None, alias="type"),
    hypothesis_id: UUID | None = Query(default=None),
    supports_hypothesis: bool | None = Query(default=None),
    submitted_by: UUID | None = Query(default=None),
) -> list[EvidenceHubOut]:
    """All evidence in the workspace (for Evidence Hub)."""
    _, workspace_id, _ = ctx
    stmt = (
        select(Evidence, Hypothesis.title)
        .join(Hypothesis, Evidence.hypothesis_id == Hypothesis.id)
        .where(Hypothesis.workspace_id == workspace_id)
    )
    if ev_type is not None:
        stmt = stmt.where(Evidence.type == ev_type)
    if hypothesis_id is not None:
        stmt = stmt.where(Evidence.hypothesis_id == hypothesis_id)
    if supports_hypothesis is not None:
        stmt = stmt.where(Evidence.supports_hypothesis == supports_hypothesis)
    if submitted_by is not None:
        stmt = stmt.where(Evidence.submitted_by == submitted_by)
    stmt = stmt.order_by(Evidence.created_at.desc()).limit(500)
    rows = (await db.execute(stmt)).all()
    return [
        EvidenceHubOut(
            id=e.id,
            hypothesis_id=e.hypothesis_id,
            hypothesis_title=str(title),
            type=e.type,
            title=e.title,
            content=e.content,
            storage_key=e.storage_key,
            mime_type=e.mime_type,
            iocs=e.iocs,
            supports_hypothesis=e.supports_hypothesis,
            weight=e.weight,
            version=e.version,
            submitted_by=e.submitted_by,
            created_at=e.created_at,
            previous_evidence_id=e.previous_evidence_id,
            siem_vendor=e.siem_vendor,
            siem_query_url=e.siem_query_url,
            siem_query_text=e.siem_query_text,
            metadata=e.meta,
        )
        for e, title in rows
    ]


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
