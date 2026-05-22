from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, get_workspace_context, require_report_writer
from app.models import ReportJob, ReportTemplate
from app.schemas import ReportJobCreate, ReportJobOut, ReportPreviewOut
from app.storage import get_artifact_bytes
from app.tasks import generate_report
from app.templates import builtin_template, render_html
from thmp_common import TokenPayload

router = APIRouter(prefix="/jobs", tags=["reporting"])


async def _get_job(db: AsyncSession, workspace_id: UUID, job_id: UUID) -> ReportJob:
    row = (
        await db.execute(
            select(ReportJob).where(ReportJob.id == job_id, ReportJob.workspace_id == workspace_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report job not found")
    return row


@router.post("", response_model=ReportJobOut, status_code=201)
async def create_job(
    body: ReportJobCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> ReportJob:
    payload, workspace_id, role = ctx
    require_report_writer(role)
    if body.template_id is not None:
        tpl = (
            await db.execute(
                select(ReportTemplate).where(
                    ReportTemplate.id == body.template_id,
                    ReportTemplate.workspace_id == workspace_id,
                )
            )
        ).scalar_one_or_none()
        if tpl is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    row = ReportJob(
        workspace_id=workspace_id,
        report_type=body.report_type,
        template_id=body.template_id,
        params=body.params,
        status="queued",
        created_by=payload.sub,
        created_by_email=payload.email,
        created_by_role=role,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    generate_report.delay(str(row.id))
    return row


@router.get("", response_model=list[ReportJobOut])
async def list_jobs(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=200),
) -> list[ReportJob]:
    _payload, workspace_id, _role = ctx
    rows = (
        await db.execute(
            select(ReportJob)
            .where(ReportJob.workspace_id == workspace_id)
            .order_by(ReportJob.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return list(rows)


@router.get("/{job_id}", response_model=ReportJobOut)
async def get_job(
    job_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> ReportJob:
    _payload, workspace_id, _role = ctx
    return await _get_job(db, workspace_id, job_id)


@router.get("/{job_id}/download")
async def download_job_artifact(
    job_id: UUID,
    format: str = Query(pattern="^(pdf|stix)$"),
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> Response:
    _payload, workspace_id, _role = ctx
    row = await _get_job(db, workspace_id, job_id)
    key = row.pdf_key if format == "pdf" else row.stix_key
    if not key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Artifact not available")
    body = get_artifact_bytes(key)
    content_type = "application/pdf" if format == "pdf" else "application/json"
    filename = f"thmp-report-{row.id}.{ 'pdf' if format == 'pdf' else 'stix.json' }"
    return Response(
        body,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{job_id}/preview", response_model=ReportPreviewOut)
async def preview_job(
    job_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> ReportPreviewOut:
    _payload, workspace_id, _role = ctx
    row = await _get_job(db, workspace_id, job_id)
    html = str((row.params or {}).get("_preview_html") or "")
    if html:
        return ReportPreviewOut(html=html)
    tpl_body = builtin_template("default")
    html = render_html(
        tpl_body,
        {
            "title": f"Report {row.id}",
            "summary": "Preview pending. Run the report and open preview again.",
            "workspace_id": str(workspace_id),
            "generated_at": row.updated_at.isoformat(),
            "sections": [],
        },
    )
    return ReportPreviewOut(html=html)
