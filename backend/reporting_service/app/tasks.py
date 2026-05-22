from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select

from app.audit_emit import emit_audit
from app.celery_app import celery_app
from app.collectors import build_report_context
from app.db import SessionLocal
from app.models import ReportJob, ReportSchedule, ReportTemplate
from app.pdf_render import html_to_pdf_bytes
from app.stix_export import build_stix_bundle
from app.storage import ensure_bucket_sync, put_artifact
from app.templates import builtin_template, render_html
from thmp_common import TokenPayload, WorkspaceClaim, create_access_token

logger = logging.getLogger(__name__)


def _make_access_token(job: ReportJob) -> str:
    payload = TokenPayload(
        sub=job.created_by,
        email=job.created_by_email,
        workspaces=[WorkspaceClaim(workspace_id=job.workspace_id, role=job.created_by_role)],
    )
    return create_access_token(payload)


async def _run_job(job_id: UUID) -> None:
    async with SessionLocal() as db:
        row = (await db.execute(select(ReportJob).where(ReportJob.id == job_id))).scalar_one_or_none()
        if row is None:
            return
        row.status = "running"
        row.error = None
        await db.commit()

        try:
            token = _make_access_token(row)
            context = await build_report_context(row.report_type, row.workspace_id, row.params or {}, token)
            tpl_row = None
            if row.template_id is not None:
                tpl_row = (
                    await db.execute(
                        select(ReportTemplate).where(
                            ReportTemplate.id == row.template_id,
                            ReportTemplate.workspace_id == row.workspace_id,
                        )
                    )
                ).scalar_one_or_none()
            template_body = tpl_row.template_body if tpl_row else builtin_template("default")
            html = render_html(template_body, context)
            pdf = html_to_pdf_bytes(html)
            stix = json.dumps(build_stix_bundle(context), indent=2).encode()
            ensure_bucket_sync()
            row.pdf_key = put_artifact(row.workspace_id, row.id, "pdf", pdf, "application/pdf")
            row.stix_key = put_artifact(row.workspace_id, row.id, "stix.json", stix, "application/json")
            next_params = dict(row.params or {})
            next_params["_preview_html"] = html
            row.params = next_params
            row.status = "succeeded"
            row.error = None
            await db.commit()
            await emit_audit(
                action="report.export",
                entity_type="report_job",
                entity_id=row.id,
                actor_user_id=row.created_by,
                workspace_id=row.workspace_id,
                diff={"report_type": row.report_type, "pdf_key": row.pdf_key, "stix_key": row.stix_key},
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("report job failed: %s", row.id)
            row.status = "failed"
            row.error = str(exc)[:4000]
            await db.commit()


@celery_app.task(name="app.tasks.generate_report")
def generate_report(job_id: str) -> None:
    asyncio.run(_run_job(UUID(job_id)))


async def _tick() -> None:
    now = datetime.now(tz=timezone.utc)
    async with SessionLocal() as db:
        rows = (
            await db.execute(
                select(ReportSchedule).where(
                    ReportSchedule.enabled.is_(True),
                    (ReportSchedule.next_run_at.is_(None) | (ReportSchedule.next_run_at <= now)),
                )
            )
        ).scalars().all()
        for sch in rows:
            job = ReportJob(
                workspace_id=sch.workspace_id,
                report_type=sch.report_type,
                template_id=sch.template_id,
                params=sch.params or {},
                status="queued",
                created_by=sch.created_by,
                created_by_email=sch.created_by_email,
                created_by_role=sch.created_by_role,
            )
            db.add(job)
            sch.last_run_at = now
            sch.next_run_at = now + timedelta(minutes=max(1, sch.interval_minutes))
            await db.flush()
            generate_report.delay(str(job.id))
            await emit_audit(
                action="report.schedule",
                entity_type="report_schedule",
                entity_id=sch.id,
                actor_user_id=sch.created_by,
                workspace_id=sch.workspace_id,
                diff={"job_id": str(job.id), "report_type": sch.report_type},
            )
        await db.commit()


@celery_app.task(name="app.tasks.tick_schedules")
def tick_schedules() -> None:
    asyncio.run(_tick())
