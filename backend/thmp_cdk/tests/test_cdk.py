from __future__ import annotations

from uuid import uuid4

from thmp_cdk import MockBatchApplier, NormalisedBatch, NormalisedHypothesis, validate_normalised_hypothesis


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
