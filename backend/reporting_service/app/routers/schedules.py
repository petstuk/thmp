from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, get_workspace_context, require_report_writer
from app.models import ReportJob, ReportSchedule, ReportTemplate
from app.schemas import (
    ReportJobOut,
    ReportScheduleCreate,
    ReportScheduleOut,
    ReportSchedulePatch,
)
from app.tasks import generate_report
from thmp_common import TokenPayload

router = APIRouter(prefix="/schedules", tags=["reporting"])


async def _get_schedule(db: AsyncSession, workspace_id: UUID, schedule_id: UUID) -> ReportSchedule:
    row = (
        await db.execute(
            select(ReportSchedule).where(
                ReportSchedule.id == schedule_id,
                ReportSchedule.workspace_id == workspace_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report schedule not found")
    return row


@router.get("", response_model=list[ReportScheduleOut])
async def list_schedules(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[ReportSchedule]:
    _payload, workspace_id, _role = ctx
    rows = (
        await db.execute(
            select(ReportSchedule)
            .where(ReportSchedule.workspace_id == workspace_id)
            .order_by(ReportSchedule.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


@router.post("", response_model=ReportScheduleOut, status_code=201)
async def create_schedule(
    body: ReportScheduleCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> ReportSchedule:
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
    now = datetime.now(tz=timezone.utc)
    row = ReportSchedule(
        workspace_id=workspace_id,
        name=body.name.strip(),
        report_type=body.report_type,
        template_id=body.template_id,
        params=body.params,
        recipients=body.recipients,
        cron=body.cron,
        interval_minutes=body.interval_minutes,
        enabled=body.enabled,
        created_by=payload.sub,
        created_by_email=payload.email,
        created_by_role=role,
        next_run_at=now + timedelta(minutes=max(1, body.interval_minutes)),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/{schedule_id}", response_model=ReportScheduleOut)
async def patch_schedule(
    schedule_id: UUID,
    body: ReportSchedulePatch,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> ReportSchedule:
    _payload, workspace_id, role = ctx
    require_report_writer(role)
    row = await _get_schedule(db, workspace_id, schedule_id)
    if body.name is not None:
        row.name = body.name.strip()
    if body.report_type is not None:
        row.report_type = body.report_type
    if body.template_id is not None:
        row.template_id = body.template_id
    if body.params is not None:
        row.params = body.params
    if body.recipients is not None:
        row.recipients = body.recipients
    if body.cron is not None:
        row.cron = body.cron
    if body.interval_minutes is not None:
        row.interval_minutes = body.interval_minutes
    if body.enabled is not None:
        row.enabled = body.enabled
    if row.enabled and row.next_run_at is None:
        row.next_run_at = datetime.now(tz=timezone.utc) + timedelta(minutes=max(1, row.interval_minutes))
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/{schedule_id}", status_code=204)
async def delete_schedule(
    schedule_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> None:
    _payload, workspace_id, role = ctx
    require_report_writer(role)
    row = await _get_schedule(db, workspace_id, schedule_id)
    await db.delete(row)
    await db.commit()


@router.post("/{schedule_id}/run", response_model=ReportJobOut, status_code=201)
async def run_schedule_now(
    schedule_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> ReportJob:
    _payload, workspace_id, role = ctx
    require_report_writer(role)
    row = await _get_schedule(db, workspace_id, schedule_id)
    job = ReportJob(
        workspace_id=row.workspace_id,
        report_type=row.report_type,
        template_id=row.template_id,
        params=row.params,
        status="queued",
        created_by=row.created_by,
        created_by_email=row.created_by_email,
        created_by_role=row.created_by_role,
    )
    row.last_run_at = datetime.now(tz=timezone.utc)
    row.next_run_at = row.last_run_at + timedelta(minutes=max(1, row.interval_minutes))
    db.add(job)
    await db.commit()
    await db.refresh(job)
    generate_report.delay(str(job.id))
    return job
