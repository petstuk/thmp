from uuid import uuid4

from servicenow.adapter import ServiceNowSirAdapter
from thmp_cdk import MockBatchApplier, NormalisedBatch


def test_servicenow_priority_maps() -> None:
    ad = ServiceNowSirAdapter()
    ws = uuid4()
    batch = ad.normalise(
        {"sys_id": "abc", "number": "SIR0001", "short_description": "x", "priority": "1"},
        workspace_id=ws,
        integration_config={"servicenow_url": "https://x.service-now.com"},
    )
    assert len(batch.hypotheses) == 1
    assert batch.hypotheses[0].severity == "critical"


def test_mock_applier() -> None:
    ad = ServiceNowSirAdapter()
    ap = MockBatchApplier()
    ap.apply(
        ad.normalise(
            [{"sys_id": "1", "short_description": "a", "priority": "4"}],
            workspace_id=uuid4(),
            integration_config={"servicenow_url": "https://x"},
        )
    )
    assert len(ap.applied_hypotheses) == 1
