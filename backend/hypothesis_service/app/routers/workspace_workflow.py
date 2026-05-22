from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, get_workspace_context, require_writer
from app.models import AnalystNotification, KanbanViewPreset, WorkspaceScoringSettings
from app.schemas import (
    AnalystNotificationOut,
    KanbanPresetCreate,
    KanbanPresetOut,
    WorkspaceScoringOut,
    WorkspaceScoringPatch,
)
from app.scoring import DEFAULT_WEIGHTS, get_workspace_weights
from thmp_common import TokenPayload

scoring_router = APIRouter(prefix="/workspace", tags=["workspace"])
kanban_router = APIRouter(prefix="/kanban", tags=["kanban"])
notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


@scoring_router.get("/scoring", response_model=WorkspaceScoringOut)
async def get_workspace_scoring(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceScoringOut:
    _, workspace_id, _ = ctx
    w = await get_workspace_weights(db, workspace_id)
    return WorkspaceScoringOut(workspace_id=workspace_id, weights=w)


@scoring_router.patch("/scoring", response_model=WorkspaceScoringOut)
async def patch_workspace_scoring(
    body: WorkspaceScoringPatch,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceScoringOut:
    _, workspace_id, role = ctx
    if role not in {"manager", "admin"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Managers or admins only")
    merged = {**DEFAULT_WEIGHTS, **{k: float(v) for k, v in body.weights.items() if k in DEFAULT_WEIGHTS}}
    s = sum(merged.values())
    if s <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid weights")
    merged = {k: merged[k] / s for k in merged}
    row = (
        await db.execute(select(WorkspaceScoringSettings).where(WorkspaceScoringSettings.workspace_id == workspace_id))
    ).scalar_one_or_none()
    if row is None:
        row = WorkspaceScoringSettings(workspace_id=workspace_id, weights=merged)
        db.add(row)
    else:
        row.weights = merged
    await db.commit()
    await db.refresh(row)
    return WorkspaceScoringOut(workspace_id=workspace_id, weights=dict(row.weights))


@kanban_router.get("/presets", response_model=list[KanbanPresetOut])
async def list_kanban_presets(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[KanbanViewPreset]:
    payload, workspace_id, _ = ctx
    q = (
        select(KanbanViewPreset)
        .where(KanbanViewPreset.workspace_id == workspace_id, KanbanViewPreset.user_id == payload.sub)
        .order_by(KanbanViewPreset.created_at.desc())
    )
    return list((await db.execute(q)).scalars().all())


@kanban_router.post("/presets", response_model=KanbanPresetOut)
async def create_kanban_preset(
    body: KanbanPresetCreate,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> KanbanViewPreset:
    payload, workspace_id, role = ctx
    require_writer(role)
    p = KanbanViewPreset(
        workspace_id=workspace_id,
        user_id=payload.sub,
        name=body.name.strip(),
        filters=body.filters,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@kanban_router.delete("/presets/{preset_id}", status_code=204)
async def delete_kanban_preset(
    preset_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> None:
    payload, workspace_id, _ = ctx
    p = (await db.execute(select(KanbanViewPreset).where(KanbanViewPreset.id == preset_id))).scalar_one_or_none()
    if not p or p.workspace_id != workspace_id or p.user_id != payload.sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Preset not found")
    await db.execute(delete(KanbanViewPreset).where(KanbanViewPreset.id == preset_id))
    await db.commit()


@notifications_router.get("", response_model=list[AnalystNotificationOut])
async def list_notifications(
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[AnalystNotification]:
    payload, workspace_id, _ = ctx
    q = (
        select(AnalystNotification)
        .where(
            AnalystNotification.workspace_id == workspace_id,
            AnalystNotification.user_id == payload.sub,
        )
        .order_by(AnalystNotification.created_at.desc())
        .limit(100)
    )
    return list((await db.execute(q)).scalars().all())


@notifications_router.post("/{notification_id}/read", response_model=AnalystNotificationOut)
async def mark_notification_read(
    notification_id: UUID,
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> AnalystNotification:
    from datetime import datetime, timezone

    payload, workspace_id, _ = ctx
    n = (
        await db.execute(
            select(AnalystNotification).where(
                AnalystNotification.id == notification_id,
                AnalystNotification.workspace_id == workspace_id,
                AnalystNotification.user_id == payload.sub,
            )
        )
    ).scalar_one_or_none()
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    n.read_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(n)
    return n
