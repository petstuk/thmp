from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_internal_token
from app.models import IntegrationConfig
from app.vault import decrypt_integration_secret
from app.schemas import InternalIntegrationConfigOut

router = APIRouter(prefix="/internal/integrations", tags=["internal"])


@router.get("/by-id/{integration_id}", response_model=InternalIntegrationConfigOut)
async def get_integration_by_id(
    integration_id: UUID,
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
) -> InternalIntegrationConfigOut:
    """Fetch a single integration row (ingestion test-connection, etc.)."""
    row = (
        await db.execute(select(IntegrationConfig).where(IntegrationConfig.id == integration_id))
    ).scalar_one_or_none()
    if not row or not row.is_enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Integration not found or disabled")
    return InternalIntegrationConfigOut(
        id=row.id,
        workspace_id=row.workspace_id,
        connector_id=row.connector_id,
        config=dict(row.config or {}),
        secret_ref=decrypt_integration_secret(row.secret_ref),
        is_enabled=row.is_enabled,
    )


@router.get("/workspace/{workspace_id}", response_model=InternalIntegrationConfigOut)
async def get_integration_for_workspace(
    workspace_id: UUID,
    connector_id: str = Query(..., min_length=1, max_length=64),
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
) -> InternalIntegrationConfigOut:
    row = (
        await db.execute(
            select(IntegrationConfig).where(
                IntegrationConfig.workspace_id == workspace_id,
                IntegrationConfig.connector_id == connector_id,
            )
        )
    ).scalar_one_or_none()
    if not row or not row.is_enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Integration not found or disabled")
    return InternalIntegrationConfigOut(
        id=row.id,
        workspace_id=row.workspace_id,
        connector_id=row.connector_id,
        config=dict(row.config or {}),
        secret_ref=decrypt_integration_secret(row.secret_ref),
        is_enabled=row.is_enabled,
    )
