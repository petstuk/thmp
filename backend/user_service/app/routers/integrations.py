from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, require_workspace_role
from app.integration_mask import mask_secret_ref
from app.models import IntegrationConfig, User
from app.schemas import IntegrationConfigCreate, IntegrationConfigOut, IntegrationConfigPatch

router = APIRouter(prefix="/integrations", tags=["integrations"])

INTEGRATION_ADMINS = frozenset({"admin", "manager"})


def _to_out(row: IntegrationConfig) -> IntegrationConfigOut:
    return IntegrationConfigOut(
        id=row.id,
        workspace_id=row.workspace_id,
        connector_id=row.connector_id,
        name=row.name,
        config=dict(row.config or {}),
        secret_ref=mask_secret_ref(row.secret_ref),
        is_enabled=row.is_enabled,
    )


@router.get("", response_model=list[IntegrationConfigOut])
async def list_integrations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> list[IntegrationConfigOut]:
    if not x_workspace_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "X-Workspace-Id header required")
    try:
        ws = UUID(x_workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid X-Workspace-Id") from exc
    require_workspace_role(user, ws, INTEGRATION_ADMINS)
    q = select(IntegrationConfig).where(IntegrationConfig.workspace_id == ws).order_by(IntegrationConfig.connector_id)
    rows = (await db.execute(q)).scalars().all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=IntegrationConfigOut, status_code=status.HTTP_201_CREATED)
async def create_integration(
    body: IntegrationConfigCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> IntegrationConfigOut:
    if not x_workspace_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "X-Workspace-Id header required")
    try:
        ws = UUID(x_workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid X-Workspace-Id") from exc
    require_workspace_role(user, ws, INTEGRATION_ADMINS)
    existing = (
        await db.execute(
            select(IntegrationConfig).where(
                IntegrationConfig.workspace_id == ws,
                IntegrationConfig.connector_id == body.connector_id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Integration for this connector already exists")
    row = IntegrationConfig(
        workspace_id=ws,
        connector_id=body.connector_id.strip(),
        name=body.name,
        config=body.config,
        secret_ref=body.secret_ref,
        is_enabled=True,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.patch("/{integration_id}", response_model=IntegrationConfigOut)
async def patch_integration(
    integration_id: UUID,
    body: IntegrationConfigPatch,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> IntegrationConfigOut:
    if not x_workspace_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "X-Workspace-Id header required")
    try:
        ws = UUID(x_workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid X-Workspace-Id") from exc
    require_workspace_role(user, ws, INTEGRATION_ADMINS)
    row = (
        await db.execute(
            select(IntegrationConfig).where(
                IntegrationConfig.id == integration_id,
                IntegrationConfig.workspace_id == ws,
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Integration not found")
    if body.name is not None:
        row.name = body.name
    if body.config is not None:
        row.config = body.config
    if body.secret_ref is not None:
        row.secret_ref = body.secret_ref
    if body.is_enabled is not None:
        row.is_enabled = body.is_enabled
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(
    integration_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> None:
    if not x_workspace_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "X-Workspace-Id header required")
    try:
        ws = UUID(x_workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid X-Workspace-Id") from exc
    require_workspace_role(user, ws, INTEGRATION_ADMINS)
    row = (
        await db.execute(
            select(IntegrationConfig).where(
                IntegrationConfig.id == integration_id,
                IntegrationConfig.workspace_id == ws,
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Integration not found")
    await db.execute(delete(IntegrationConfig).where(IntegrationConfig.id == integration_id))
    await db.commit()
