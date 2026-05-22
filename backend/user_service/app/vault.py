"""Envelope encryption for integration secrets at rest (AES-256-GCM, KEK = THMP_JWT_SECRET)."""
from __future__ import annotations

import base64
import hashlib
import os

_PREFIX = "thmpenc:v1:"


def _derive_key() -> bytes:
    secret = os.environ.get("THMP_JWT_SECRET", "")
    return hashlib.sha256(secret.encode()).digest()


def encrypt_integration_secret(plain: str | None) -> str | None:
    if plain is None or plain == "":
        return None
    if plain.startswith(_PREFIX):
        return plain
    if not os.environ.get("THMP_JWT_SECRET"):
        return plain
    import secrets
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    key = _derive_key()
    nonce = secrets.token_bytes(12)
    ct = AESGCM(key).encrypt(nonce, plain.encode(), None)
    payload = base64.b64encode(nonce + ct).decode()
    return f"{_PREFIX}{payload}"


def decrypt_integration_secret(stored: str | None) -> str | None:
    if stored is None or stored == "":
        return None
    if not stored.startswith(_PREFIX):
        return stored
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    raw = base64.b64decode(stored[len(_PREFIX) :])
    key = _derive_key()
    nonce, ct = raw[:12], raw[12:]
    return AESGCM(key).decrypt(nonce, ct, None).decode()
