from __future__ import annotations

from uuid import uuid4

import pytest
from thmp_cdk import (
    MockBatchApplier,
    NormalisedBatch,
    NormalisedHypothesis,
    WebhookSignatureError,
    compute_hmac_sha256,
    validate_normalised_hypothesis,
    verify_hmac_sha256,
)


def test_normalised_hypothesis_roundtrip() -> None:
    wid = uuid4()
    h = NormalisedHypothesis(
        title="t",
        description="d",
        severity="medium",
        source_type="integration",
        dedupe_key="k1",
        workspace_id=wid,
        source_ref={"vendor": {"id": "1"}},
    )
    d = h.model_dump(mode="json")
    h2 = validate_normalised_hypothesis(d)
    assert h2.title == "t"
    assert h2.workspace_id == wid


def test_mock_applier() -> None:
    applier = MockBatchApplier()
    batch = NormalisedBatch(
        hypotheses=[
            NormalisedHypothesis(
                title="a",
                source_type="integration",
                dedupe_key="x",
            )
        ]
    )
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 1
    assert applier.batches[0] is batch


# ---------------------------------------------------------------------------
# Webhook signature tests
# ---------------------------------------------------------------------------

def test_compute_hmac_sha256_is_deterministic() -> None:
    body = b"hello world"
    secret = "my-secret"
    h1 = compute_hmac_sha256(body, secret)
    h2 = compute_hmac_sha256(body, secret)
    assert h1 == h2
    assert len(h1) == 64  # sha256 hex


def test_verify_hmac_sha256_valid() -> None:
    body = b'{"event": "test"}'
    secret = "webhook-secret"
    sig = compute_hmac_sha256(body, secret)
    verify_hmac_sha256(body, secret=secret, signature_header=f"sha256={sig}")


def test_verify_hmac_sha256_invalid_raises() -> None:
    body = b'{"event": "test"}'
    with pytest.raises(WebhookSignatureError, match="mismatch"):
        verify_hmac_sha256(body, secret="correct-secret", signature_header="sha256=badhex")


def test_verify_hmac_sha256_missing_header() -> None:
    with pytest.raises(WebhookSignatureError, match="Missing"):
        verify_hmac_sha256(b"body", secret="secret", signature_header="")


def test_verify_hmac_sha256_no_prefix() -> None:
    body = b"data"
    secret = "s"
    sig = compute_hmac_sha256(body, secret)
    # Should work without prefix when prefix is empty string
    verify_hmac_sha256(body, secret=secret, signature_header=sig, prefix="")


# ---------------------------------------------------------------------------
# MockPlatformServer test
# ---------------------------------------------------------------------------

def test_mock_platform_server_creates_app() -> None:
    from thmp_cdk import make_mock_platform_server
    ws = uuid4()
    app = make_mock_platform_server(workspace_id=ws)
    assert app is not None
    assert hasattr(app, "routes")
