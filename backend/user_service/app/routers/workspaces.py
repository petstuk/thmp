from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_current_user, get_db, get_token_payload, require_workspace_role
from app.models import User, Workspace, WorkspaceMembership
from app.schemas import WorkspaceListResponse, WorkspaceMemberOut, WorkspaceOut

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


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberOut])
async def list_workspace_members(
    workspace_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WorkspaceMemberOut]:
    """Users in the workspace (for @mention typeahead)."""
    require_workspace_role(
        user,
        workspace_id,
        {"admin", "manager", "analyst", "hunt_lead", "ti_analyst"},
    )
    q = (
        select(WorkspaceMembership)
        .where(WorkspaceMembership.workspace_id == workspace_id)
        .options(selectinload(WorkspaceMembership.user), selectinload(WorkspaceMembership.role))
    )
    rows = (await db.execute(q)).scalars().unique().all()
    out: list[WorkspaceMemberOut] = []
    for m in rows:
        u = m.user
        r = m.role
        if not u or not r:
            continue
        out.append(
            WorkspaceMemberOut(id=u.id, email=u.email, display_name=u.display_name, role=r.name),
        )
    return sorted(out, key=lambda x: x.display_name.lower())
