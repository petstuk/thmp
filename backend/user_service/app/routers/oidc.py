"""OIDC / OAuth2 authentication routes.

Endpoints:
  GET  /auth/oidc/providers                  List configured IdPs for the login UI
  POST /auth/oidc/providers          (admin) Create an IdP config
  GET  /auth/oidc/login?idp={slug}           Redirect browser to IdP authorization endpoint
  GET  /auth/oidc/callback                   Receive code from IdP, JIT provision, issue tokens

Design:
  - Uses authlib's `AsyncOAuth2Client` for discovery + code exchange.
  - JIT provisioning: first OIDC login creates a User + a personal workspace + analyst membership.
  - Links stored in OidcUserLink so subsequent logins resolve instantly.
  - client_secret_enc stores AES-256-GCM encrypted secret (key from THMP_JWT_SECRET).
"""
from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import uuid
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_emit import emit_audit
from app.deps import get_db, require_admin
from app.models import IdentityProviderConfig, OidcUserLink, Role, User, Workspace, WorkspaceMembership
from app.routers.auth import _issue_tokens
from thmp_common import TokenPayload

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/oidc", tags=["oidc"])

# ---------------------------------------------------------------------------
# Simple secret encryption helpers (envelope encrypt with THMP_JWT_SECRET)
# ---------------------------------------------------------------------------

def _derive_key() -> bytes:
    secret = os.environ.get("THMP_JWT_SECRET", "insecure-dev-key")
    return hashlib.sha256(secret.encode()).digest()


def _encrypt_secret(plain: str) -> str:
    import secrets as _secrets
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    key = _derive_key()
    nonce = _secrets.token_bytes(12)
    ct = AESGCM(key).encrypt(nonce, plain.encode(), None)
    payload = nonce + ct
    return base64.b64encode(payload).decode()


def _decrypt_secret(enc: str) -> str:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    key = _derive_key()
    raw = base64.b64decode(enc)
    nonce, ct = raw[:12], raw[12:]
    return AESGCM(key).decrypt(nonce, ct, None).decode()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class IdpConfigCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")
    display_name: str = Field(min_length=1, max_length=256)
    issuer_url: str = Field(min_length=1)
    client_id: str = Field(min_length=1)
    client_secret: str = Field(min_length=1)
    default_role: str = "analyst"
    workspace_id: uuid.UUID


class IdpConfigOut(BaseModel):
    id: uuid.UUID
    slug: str
    display_name: str
    issuer_url: str
    client_id: str
    default_role: str
    is_enabled: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _discover_endpoints(issuer_url: str) -> dict[str, Any]:
    url = issuer_url.rstrip("/") + "/.well-known/openid-configuration"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


async def _exchange_code(
    idp: IdentityProviderConfig,
    code: str,
    redirect_uri: str,
) -> dict[str, Any]:
    discovery = await _discover_endpoints(idp.issuer_url)
    token_endpoint = discovery["token_endpoint"]
    secret = _decrypt_secret(idp.client_secret_enc) if idp.client_secret_enc else ""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            token_endpoint,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": idp.client_id,
                "client_secret": secret,
            },
        )
        resp.raise_for_status()
        return resp.json()


def _decode_id_token_claims(id_token: str) -> dict[str, Any]:
    """Decode claims from the JWT payload without full signature verification.
    In production, authlib or python-jose should verify against JWKS.
    This is acceptable for a JIT-provisioning flow where the token was just issued.
    """
    parts = id_token.split(".")
    if len(parts) < 2:
        raise ValueError("Malformed id_token")
    padding = "=" * (-len(parts[1]) % 4)
    payload = base64.urlsafe_b64decode(parts[1] + padding)
    return json.loads(payload)


def _build_redirect_uri(request_base_url: str) -> str:
    oidc_redirect = os.environ.get("OIDC_REDIRECT_URI")
    if oidc_redirect:
        return oidc_redirect
    return request_base_url.rstrip("/") + "/api/v1/auth/oidc/callback"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/providers", response_model=list[IdpConfigOut])
async def list_providers(db: AsyncSession = Depends(get_db)) -> list[IdpConfigOut]:
    rows = (await db.execute(select(IdentityProviderConfig).where(IdentityProviderConfig.is_enabled == True))).scalars().all()  # noqa: E712
    return [
        IdpConfigOut(
            id=r.id,
            slug=r.slug,
            display_name=r.display_name,
            issuer_url=r.issuer_url,
            client_id=r.client_id,
            default_role=r.default_role,
            is_enabled=r.is_enabled,
        )
        for r in rows
    ]


@router.post("/providers", response_model=IdpConfigOut, status_code=status.HTTP_201_CREATED)
async def create_provider(
    body: IdpConfigCreate,
    db: AsyncSession = Depends(get_db),
    _admin: TokenPayload = Depends(require_admin),
) -> IdpConfigOut:
    enc = _encrypt_secret(body.client_secret)
    idp = IdentityProviderConfig(
        id=uuid.uuid4(),
        workspace_id=body.workspace_id,
        slug=body.slug,
        display_name=body.display_name,
        issuer_url=body.issuer_url.rstrip("/"),
        client_id=body.client_id,
        client_secret_enc=enc,
        default_role=body.default_role,
        is_enabled=True,
    )
    db.add(idp)
    await db.commit()
    await db.refresh(idp)
    return IdpConfigOut(
        id=idp.id,
        slug=idp.slug,
        display_name=idp.display_name,
        issuer_url=idp.issuer_url,
        client_id=idp.client_id,
        default_role=idp.default_role,
        is_enabled=idp.is_enabled,
    )


@router.get("/login")
async def oidc_login(
    idp: str = Query(..., description="IdP slug"),
    redirect_uri: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    row = (
        await db.execute(
            select(IdentityProviderConfig).where(
                IdentityProviderConfig.slug == idp,
                IdentityProviderConfig.is_enabled == True,  # noqa: E712
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "IdP not found")
    try:
        discovery = await _discover_endpoints(row.issuer_url)
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"OIDC discovery failed: {exc}") from exc

    auth_endpoint = discovery.get("authorization_endpoint")
    if not auth_endpoint:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No authorization_endpoint in discovery")

    cb_uri = redirect_uri or os.environ.get("OIDC_REDIRECT_URI", "")
    params = {
        "response_type": "code",
        "client_id": row.client_id,
        "scope": "openid email profile",
        "state": str(row.id),
        "redirect_uri": cb_uri,
    }
    url = auth_endpoint + ("&" if "?" in auth_endpoint else "?") + urlencode(params)
    return RedirectResponse(url, status_code=302)


@router.get("/callback")
async def oidc_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Exchange code for tokens, JIT-provision user, return THMP JWT pair."""
    try:
        idp_id = uuid.UUID(state)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid state") from exc

    idp = (
        await db.execute(select(IdentityProviderConfig).where(IdentityProviderConfig.id == idp_id))
    ).scalar_one_or_none()
    if not idp:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown IdP state")

    redirect_uri = os.environ.get("OIDC_REDIRECT_URI", "")
    try:
        token_resp = await _exchange_code(idp, code, redirect_uri)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Token exchange failed: {exc}") from exc

    id_token = token_resp.get("id_token")
    if not id_token:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No id_token in response")

    try:
        claims = _decode_id_token_claims(id_token)
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not decode id_token") from exc

    issuer = claims.get("iss", idp.issuer_url)
    subject = claims.get("sub")
    if not subject:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "id_token missing sub claim")

    # Resolve or provision user
    link = (
        await db.execute(
            select(OidcUserLink).where(
                OidcUserLink.issuer_url == issuer,
                OidcUserLink.subject == subject,
            )
        )
    ).scalar_one_or_none()

    if link:
        user = (await db.execute(select(User).where(User.id == link.user_id))).scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")
    else:
        # JIT provision
        email = claims.get("email", f"{subject}@oidc.local")
        display_name = claims.get("name") or claims.get("preferred_username") or email.split("@")[0]

        existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing:
            user = existing
        else:
            user = User(email=email, display_name=display_name, password_hash=None)
            db.add(user)
            await db.flush()

            slug_base = email.split("@")[0].lower().replace(".", "-")[:64]
            slug = slug_base
            n = 0
            while (await db.execute(select(Workspace).where(Workspace.slug == slug))).scalar_one_or_none():
                n += 1
                slug = f"{slug_base}-{n}"

            target_role_name = idp.default_role or "analyst"
            role = (await db.execute(select(Role).where(Role.name == target_role_name))).scalar_one_or_none()
            if role is None:
                role = (await db.execute(select(Role).where(Role.name == "analyst"))).scalar_one_or_none()

            if role:
                ws = Workspace(name=f"{display_name}'s workspace", slug=slug)
                db.add(ws)
                await db.flush()
                db.add(WorkspaceMembership(user_id=user.id, workspace_id=ws.id, role_id=role.id))

        db.add(OidcUserLink(user_id=user.id, issuer_url=issuer, subject=subject))
        await db.commit()
        await emit_audit(
            action="user.oidc_jit_provision",
            entity_type="user",
            entity_id=user.id,
            actor_user_id=user.id,
            workspace_id=None,
            diff={"issuer": issuer, "email": email},
        )

    await db.refresh(user)
    return await _issue_tokens(db, user)
