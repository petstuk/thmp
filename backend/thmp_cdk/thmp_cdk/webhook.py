"""Webhook signature verification helpers.

Provides HMAC-SHA256 verification matching the patterns used by:
  - GitHub (X-Hub-Signature-256)
  - Elastic SCM (X-Thmp-Signature)
  - Generic connectors (X-Signature-SHA256)

Usage in a connector:

    from thmp_cdk.webhook import verify_hmac_sha256

    @router.post("/webhook")
    async def receive(request: Request, body: bytes = Depends(read_body)):
        secret = integration_config["webhook_secret"]
        sig = request.headers.get("X-Hub-Signature-256", "")
        verify_hmac_sha256(body, secret=secret, signature_header=sig)
"""
from __future__ import annotations

import hashlib
import hmac


class WebhookSignatureError(Exception):
    """Raised when a webhook signature is missing or invalid."""


def compute_hmac_sha256(body: bytes, secret: str) -> str:
    """Return hex digest of HMAC-SHA256(secret, body)."""
    mac = hmac.new(secret.encode(), msg=body, digestmod=hashlib.sha256)
    return mac.hexdigest()


def verify_hmac_sha256(
    body: bytes,
    *,
    secret: str,
    signature_header: str,
    prefix: str = "sha256=",
) -> None:
    """Verify an HMAC-SHA256 webhook signature.

    Args:
        body: Raw request body bytes.
        secret: Shared webhook secret (str).
        signature_header: Value of the signature header from the request.
        prefix: Vendor-specific prefix before the hex digest (default: 'sha256=').

    Raises:
        WebhookSignatureError: If the signature is missing or does not match.
    """
    if not signature_header:
        raise WebhookSignatureError("Missing signature header")

    if prefix and signature_header.startswith(prefix):
        provided = signature_header[len(prefix):]
    else:
        provided = signature_header

    expected = compute_hmac_sha256(body, secret)
    if not hmac.compare_digest(provided.encode(), expected.encode()):
        raise WebhookSignatureError("Signature mismatch")
