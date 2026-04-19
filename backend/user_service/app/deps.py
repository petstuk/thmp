from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.models import User, WorkspaceMembership
from thmp_common import TokenPayload, decode_access_token


async def get_db(session: AsyncSession = Depends(get_session)) -> AsyncSession:
    return session


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc

    result = await db.execute(select(User).where(User.id == payload.sub))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    user._token_payload = payload  # type: ignore[attr-defined]
    return user


def get_token_payload(user: User) -> TokenPayload:
    return user._token_payload  # type: ignore[attr-defined]


def workspace_role(payload: TokenPayload, workspace_id: UUID) -> str | None:
    for w in payload.workspaces:
        if w.workspace_id == workspace_id:
            return w.role
    return None


def require_workspace_role(user: User, workspace_id: UUID, allowed: set[str]) -> str:
    payload = get_token_payload(user)
    role = workspace_role(payload, workspace_id)
    if role is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this workspace")
    if role not in allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
    return role


async def load_membership(db: AsyncSession, user_id: UUID, workspace_id: UUID) -> WorkspaceMembership | None:
    q = (
        select(WorkspaceMembership)
        .where(
            WorkspaceMembership.user_id == user_id,
            WorkspaceMembership.workspace_id == workspace_id,
        )
        .options(selectinload(WorkspaceMembership.role))
    )
    return (await db.execute(q)).scalar_one_or_none()
