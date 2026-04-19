from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, get_token_payload
from app.models import User, Workspace
from app.schemas import WorkspaceListResponse, WorkspaceOut

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=WorkspaceListResponse)
async def list_workspaces(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceListResponse:
    payload = get_token_payload(user)
    role_by_ws = {w.workspace_id: w.role for w in payload.workspaces}
    ids = list(role_by_ws.keys())
    if not ids:
        return WorkspaceListResponse(workspaces=[])
    q = select(Workspace).where(Workspace.id.in_(ids))
    rows = (await db.execute(q)).scalars().all()
    workspaces = [
        WorkspaceOut(id=w.id, name=w.name, slug=w.slug, role=role_by_ws[w.id]) for w in rows
    ]
    return WorkspaceListResponse(workspaces=workspaces)
