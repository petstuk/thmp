"""Unit tests for auth logic that do not require a live database."""
from __future__ import annotations

import pytest
from thmp_common import create_access_token, decode_access_token, hash_password, verify_password
from thmp_common.config import Settings
from thmp_common import TokenPayload, WorkspaceClaim
import uuid


@pytest.fixture
def settings() -> Settings:
    return Settings(
        thmp_jwt_secret="test-secret-key-for-tests-only",
        thmp_jwt_issuer="thmp",
        thmp_jwt_audience="thmp-api",
    )


def test_password_hash_and_verify() -> None:
    pw = "super-secret-1234"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_round_trip(settings: Settings) -> None:
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    payload = TokenPayload(
        sub=user_id,
        email="test@example.com",
        workspaces=[WorkspaceClaim(workspace_id=ws_id, role="analyst")],
    )
    token = create_access_token(payload, settings=settings)
    assert isinstance(token, str)
    decoded = decode_access_token(token, settings=settings)
    assert decoded.sub == user_id
    assert decoded.email == "test@example.com"
    assert len(decoded.workspaces) == 1
    assert decoded.workspaces[0].role == "analyst"


def test_invalid_token_raises(settings: Settings) -> None:
    from jose import JWTError
    with pytest.raises(JWTError):
        decode_access_token("not.a.valid.token", settings=settings)


def test_oidc_encrypt_decrypt() -> None:
    """Test OIDC secret envelope encryption."""
    import os
    os.environ["THMP_JWT_SECRET"] = "test-secret-key-for-tests-only"
    from app.routers.oidc import _encrypt_secret, _decrypt_secret
    plain = "super-client-secret-value"
    enc = _encrypt_secret(plain)
    assert enc != plain
    assert _decrypt_secret(enc) == plain


def test_oidc_id_token_decode() -> None:
    """Decode claims from a structurally valid (but unsigned) id_token."""
    import json
    import base64
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode()).decode().rstrip("=")
    claims = {"sub": "test-sub-123", "iss": "https://example.com", "email": "user@example.com"}
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    fake_token = f"{header}.{payload}.sig"
    from app.routers.oidc import _decode_id_token_claims
    decoded = _decode_id_token_claims(fake_token)
    assert decoded["sub"] == "test-sub-123"
    assert decoded["email"] == "user@example.com"
