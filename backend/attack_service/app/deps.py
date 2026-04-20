from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from thmp_common import TokenPayload, decode_access_token

READ_ONLY = "read_only"
ADMIN_ROLES = frozenset({"admin"})


async def get_db(session: AsyncSession = Depends(get_session)) -> AsyncSession:
    return session


def _workspace_role(payload: TokenPayload, workspace_id: UUID) -> str | None:
    for w in payload.workspaces:
        if w.workspace_id == workspace_id:
            return w.role
    return None


async def get_workspace_context(
    authorization: Annotated[str | None, Header()] = None,
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> tuple[TokenPayload, UUID, str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    if not x_workspace_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "X-Workspace-Id header required")
    try:
        workspace_id = UUID(x_workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid X-Workspace-Id") from exc
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    role = _workspace_role(payload, workspace_id)
    if role is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this workspace")
    return payload, workspace_id, role


def require_workspace_admin(role: str) -> None:
    if role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required in this workspace")


def require_internal_token(x_internal_token: Annotated[str | None, Header()] = None) -> None:
    import os

    expected = os.environ.get("THMP_INTERNAL_API_SECRET", "")
    if not expected or x_internal_token != expected:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid internal token")
