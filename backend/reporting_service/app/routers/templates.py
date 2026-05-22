from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, get_workspace_context, require_report_writer
from app.models import ReportTemplate
from app.schemas import ReportTemplateCreate, ReportTemplateOut, ReportTemplatePatch
from thmp_common import TokenPayload

router = APIRouter(prefix="/templates", tags=["reporting"])


@router.get("", response_model=list[ReportTemplateOut])
async def list_templates(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[ReportTemplate]:
    _payload, workspace_id, _role = ctx
    rows = (
        await db.execute(
            select(ReportTemplate)
            .where(ReportTemplate.workspace_id == workspace_id)
            .order_by(ReportTemplate.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


@router.post("", response_model=ReportTemplateOut, status_code=201)
async def create_template(
    body: ReportTemplateCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> ReportTemplate:
    _payload, workspace_id, role = ctx
    require_report_writer(role)
    row = ReportTemplate(
        workspace_id=workspace_id,
        name=body.name.strip(),
        template_body=body.template_body,
        branding=body.branding,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def _get_template(db: AsyncSession, workspace_id: UUID, template_id: UUID) -> ReportTemplate:
    row = (
        await db.execute(
            select(ReportTemplate).where(
                ReportTemplate.id == template_id,
                ReportTemplate.workspace_id == workspace_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    return row


@router.patch("/{template_id}", response_model=ReportTemplateOut)
async def patch_template(
    template_id: UUID,
    body: ReportTemplatePatch,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> ReportTemplate:
    _payload, workspace_id, role = ctx
    require_report_writer(role)
    row = await _get_template(db, workspace_id, template_id)
    if body.name is not None:
        row.name = body.name.strip()
    if body.template_body is not None:
        row.template_body = body.template_body
    if body.branding is not None:
        row.branding = body.branding
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> None:
    _payload, workspace_id, role = ctx
    require_report_writer(role)
    row = await _get_template(db, workspace_id, template_id)
    await db.delete(row)
    await db.commit()
