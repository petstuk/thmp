"""THMP Connector Development Kit — shared types and adapter base classes."""

from thmp_cdk.adapter import ConnectorAdapter
from thmp_cdk.testing import MockBatchApplier
from thmp_cdk.types import NormalisedBatch, NormalisedHypothesis
from thmp_cdk.validate import validate_normalised_hypothesis

__all__ = [
    "ConnectorAdapter",
    "MockBatchApplier",
    "NormalisedBatch",
    "NormalisedHypothesis",
    "validate_normalised_hypothesis",
]
