from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, get_token_payload
from app.models import User, Workspace
from app.schemas import UserMeOut, WorkspaceOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeOut)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> UserMeOut:
    payload = get_token_payload(user)
    ids = [w.workspace_id for w in payload.workspaces]
    if not ids:
        return UserMeOut(id=user.id, email=user.email, display_name=user.display_name, workspaces=[])
    q = select(Workspace).where(Workspace.id.in_(ids))
    ws_map = {w.id: w for w in (await db.execute(q)).scalars().all()}
    workspaces: list[WorkspaceOut] = []
    for wc in payload.workspaces:
        w = ws_map.get(wc.workspace_id)
        if w:
            workspaces.append(WorkspaceOut(id=w.id, name=w.name, slug=w.slug, role=wc.role))
    return UserMeOut(id=user.id, email=user.email, display_name=user.display_name, workspaces=workspaces)
