from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from elastic_siem.adapter import ElasticSiemAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {
    "elastic_url": "https://elastic.example.com:9200",
    "api_key": "id:base64key==",
    "space_id": "default",
}

ELASTIC_ALERT = {
    "_id": "alert-abc123",
    "kibana.alert.rule.name": "Windows PowerShell Execution",
    "kibana.alert.reason": "Process powershell.exe was detected by rule Windows PowerShell Execution.",
    "kibana.alert.severity": "high",
    "kibana.alert.rule.timeline_id": "timeline-xyz789",
}


@pytest.fixture()
def adapter() -> ElasticSiemAdapter:
    return ElasticSiemAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_one_alert_produces_one_hypothesis(
    adapter: ElasticSiemAdapter, applier: MockBatchApplier
) -> None:
    batch = adapter.normalise(ELASTIC_ALERT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 1


def test_severity_high(adapter: ElasticSiemAdapter) -> None:
    batch = adapter.normalise(ELASTIC_ALERT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "high"


def test_severity_critical(adapter: ElasticSiemAdapter) -> None:
    alert = {**ELASTIC_ALERT, "_id": "alert-crit", "kibana.alert.severity": "critical"}
    batch = adapter.normalise(alert, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "critical"


def test_source_type(adapter: ElasticSiemAdapter) -> None:
    batch = adapter.normalise(ELASTIC_ALERT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].source_type == "siem"


def test_dedupe_key(adapter: ElasticSiemAdapter) -> None:
    batch = adapter.normalise(ELASTIC_ALERT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "elastic_siem:alert-abc123"


def test_source_ref_fields(adapter: ElasticSiemAdapter) -> None:
    batch = adapter.normalise(ELASTIC_ALERT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.source_ref is not None
    assert hyp.source_ref["alert_id"] == "alert-abc123"
    assert hyp.source_ref["timeline_id"] == "timeline-xyz789"


def test_title_from_rule_name(adapter: ElasticSiemAdapter) -> None:
    batch = adapter.normalise(ELASTIC_ALERT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].title == "Windows PowerShell Execution"


def test_list_of_alerts(adapter: ElasticSiemAdapter) -> None:
    alerts = [
        ELASTIC_ALERT,
        {**ELASTIC_ALERT, "_id": "alert-def456", "kibana.alert.severity": "medium"},
    ]
    batch = adapter.normalise(alerts, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert len(batch.hypotheses) == 2
