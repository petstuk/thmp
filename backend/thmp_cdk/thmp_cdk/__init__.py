"""THMP Connector Development Kit — shared types and adapter base classes."""

from thmp_cdk.adapter import ConnectorAdapter
from thmp_cdk.testing import MockBatchApplier, load_connector_by_id, make_mock_platform_server
from thmp_cdk.types import NormalisedBatch, NormalisedHypothesis
from thmp_cdk.validate import validate_normalised_hypothesis
from thmp_cdk.webhook import WebhookSignatureError, compute_hmac_sha256, verify_hmac_sha256

__all__ = [
    "ConnectorAdapter",
    "MockBatchApplier",
    "NormalisedBatch",
    "NormalisedHypothesis",
    "WebhookSignatureError",
    "compute_hmac_sha256",
    "load_connector_by_id",
    "make_mock_platform_server",
    "validate_normalised_hypothesis",
    "verify_hmac_sha256",
]
