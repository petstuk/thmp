from __future__ import annotations

from thmp_cdk.types import NormalisedBatch, NormalisedHypothesis


class MockBatchApplier:
    """In-memory collector for unit tests (simulates platform apply)."""

    def __init__(self) -> None:
        self.applied_hypotheses: list[NormalisedHypothesis] = []
        self.batches: list[NormalisedBatch] = []

    def apply(self, batch: NormalisedBatch) -> None:
        self.batches.append(batch)
        self.applied_hypotheses.extend(batch.hypotheses)
