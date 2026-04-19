from __future__ import annotations

import os
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from thmp_common import decode_access_token

ADMIN_ROLES = frozenset({"admin"})


async def get_db(session: AsyncSession = Depends(get_session)) -> AsyncSession:
    return session


def require_internal_token(x_internal_token: Annotated[str | None, Header()] = None) -> None:
    expected = os.environ.get("THMP_INTERNAL_API_SECRET", "")
    if not expected or x_internal_token != expected:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid internal token")


async def require_audit_admin(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    roles = {w.role for w in payload.workspaces}
    if not roles.intersection(ADMIN_ROLES):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
