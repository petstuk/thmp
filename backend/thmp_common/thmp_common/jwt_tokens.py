from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from pydantic import BaseModel, Field

from thmp_common.config import Settings, get_settings


class WorkspaceClaim(BaseModel):
    workspace_id: UUID
    role: str


class TokenPayload(BaseModel):
    sub: UUID
    email: str
    workspaces: list[WorkspaceClaim] = Field(default_factory=list)


def create_access_token(
    payload: TokenPayload,
    *,
    settings: Settings | None = None,
) -> str:
    settings = settings or get_settings()
    now = datetime.now(tz=UTC)
    exp = now + timedelta(minutes=settings.access_token_minutes)
    claims: dict[str, Any] = {
        "sub": str(payload.sub),
        "email": payload.email,
        "workspaces": [w.model_dump(mode="json") for w in payload.workspaces],
        "iss": settings.thmp_jwt_issuer,
        "aud": settings.thmp_jwt_audience,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "token_type": "access",
    }
    return jwt.encode(claims, settings.thmp_jwt_secret, algorithm="HS256")


def create_refresh_token(
    user_id: UUID,
    jti: str,
    *,
    settings: Settings | None = None,
) -> str:
    settings = settings or get_settings()
    now = datetime.now(tz=UTC)
    exp = now + timedelta(days=settings.refresh_token_days)
    claims: dict[str, Any] = {
        "sub": str(user_id),
        "iss": settings.thmp_jwt_issuer,
        "aud": settings.thmp_jwt_audience,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "token_type": "refresh",
        "jti": jti,
    }
    return jwt.encode(claims, settings.thmp_jwt_secret, algorithm="HS256")


def decode_token(token: str, *, settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    return jwt.decode(
        token,
        settings.thmp_jwt_secret,
        algorithms=["HS256"],
        audience=settings.thmp_jwt_audience,
        issuer=settings.thmp_jwt_issuer,
    )


def parse_access_payload(data: dict[str, Any]) -> TokenPayload:
    try:
        workspaces_raw = data.get("workspaces") or []
        workspaces = [WorkspaceClaim.model_validate(w) for w in workspaces_raw]
        return TokenPayload(sub=UUID(str(data["sub"])), email=str(data["email"]), workspaces=workspaces)
    except (KeyError, ValueError, TypeError) as exc:
        raise JWTError("Invalid access token payload") from exc


def decode_access_token(token: str, *, settings: Settings | None = None) -> TokenPayload:
    data = decode_token(token, settings=settings)
    if data.get("token_type") != "access":
        raise JWTError("Not an access token")
    return parse_access_payload(data)
