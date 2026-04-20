from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_emit import emit_audit
from app.deps import get_db
from app.models import RefreshToken, Role, User, Workspace, WorkspaceMembership
from app.schemas import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from thmp_common import (
    TokenPayload,
    WorkspaceClaim,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from thmp_common.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    slug_base = body.email.split("@")[0].lower().replace(".", "-")[:64]
    slug = slug_base
    n = 0
    while (await db.execute(select(Workspace).where(Workspace.slug == slug))).scalar_one_or_none():
        n += 1
        slug = f"{slug_base}-{n}"

    admin_role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one_or_none()
    if admin_role is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Database roles not seeded; run: docker compose exec user-service alembic upgrade head",
        )
    user = User(
        email=body.email,
        display_name=body.display_name,
        password_hash=hash_password(body.password),
    )
    ws = Workspace(name=f"{body.display_name}'s workspace", slug=slug)
    db.add(user)
    db.add(ws)
    await db.flush()

    db.add(WorkspaceMembership(user_id=user.id, workspace_id=ws.id, role_id=admin_role.id))
    await db.commit()

    await emit_audit(
        action="user.register",
        entity_type="user",
        entity_id=user.id,
        actor_user_id=user.id,
        workspace_id=ws.id,
        diff={"email": body.email},
    )

    return await _issue_tokens(db, user)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")
    return await _issue_tokens(db, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    settings = get_settings()
    try:
        data = decode_token(body.refresh_token, settings=settings)
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token") from exc
    if data.get("token_type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not a refresh token")
    jti = str(data.get("jti") or "")
    user_id = uuid.UUID(str(data["sub"]))
    row = (
        await db.execute(
            select(RefreshToken).where(RefreshToken.jti == jti, RefreshToken.user_id == user_id)
        )
    ).scalar_one_or_none()
    if not row or row.revoked_at is not None or row.expires_at < datetime.now(tz=timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token invalid")
    row.revoked_at = datetime.now(tz=timezone.utc)
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User invalid")
    await db.commit()
    return await _issue_tokens(db, user)


async def _issue_tokens(db: AsyncSession, user: User) -> TokenResponse:
    settings = get_settings()
    q = (
        select(WorkspaceMembership, Role)
        .join(Role, WorkspaceMembership.role_id == Role.id)
        .where(WorkspaceMembership.user_id == user.id)
    )
    rows = (await db.execute(q)).all()
    claims = [
        WorkspaceClaim(workspace_id=m.workspace_id, role=r.name) for m, r in rows
    ]
    access = create_access_token(
        TokenPayload(sub=user.id, email=user.email, workspaces=claims),
        settings=settings,
    )
    jti = uuid.uuid4().hex
    refresh = create_refresh_token(user.id, jti, settings=settings)
    exp = datetime.now(tz=timezone.utc) + timedelta(days=settings.refresh_token_days)
    db.add(RefreshToken(user_id=user.id, jti=jti, expires_at=exp))
    await db.commit()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_minutes * 60,
    )
