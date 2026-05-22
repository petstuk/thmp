from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from sentinel.adapter import SentinelAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "subscription_id": "00000000-0000-0000-0000-000000000002",
    "workspace_name": "my-sentinel-workspace",
    "client_id": "00000000-0000-0000-0000-000000000003",
    "client_secret": "super-secret",
}

SENTINEL_INCIDENT = {
    "id": "sentinel-incident-001",
    "name": "Suspicious PowerShell Execution",
    "description": "PowerShell encoded command executed from unusual parent process.",
    "severity": "High",
    "status": "New",
    "additionalData": {
        "tactics": ["Execution", "DefenseEvasion"],
    },
}


@pytest.fixture()
def adapter() -> SentinelAdapter:
    return SentinelAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_one_incident_produces_one_hypothesis(
    adapter: SentinelAdapter, applier: MockBatchApplier
) -> None:
    batch = adapter.normalise(SENTINEL_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 1


def test_severity_high(adapter: SentinelAdapter) -> None:
    batch = adapter.normalise(SENTINEL_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "high"


def test_severity_informational(adapter: SentinelAdapter) -> None:
    incident = {**SENTINEL_INCIDENT, "id": "sentinel-002", "severity": "Informational"}
    batch = adapter.normalise(incident, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "informational"


def test_source_type(adapter: SentinelAdapter) -> None:
    batch = adapter.normalise(SENTINEL_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].source_type == "siem"


def test_dedupe_key(adapter: SentinelAdapter) -> None:
    batch = adapter.normalise(SENTINEL_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "sentinel:sentinel-incident-001"


def test_tactics_in_metadata(adapter: SentinelAdapter) -> None:
    batch = adapter.normalise(SENTINEL_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.metadata is not None
    assert "Execution" in hyp.metadata.get("attack_tactic_hints", [])
    assert "DefenseEvasion" in hyp.metadata.get("attack_tactic_hints", [])


def test_list_of_incidents(adapter: SentinelAdapter) -> None:
    incidents = [
        SENTINEL_INCIDENT,
        {**SENTINEL_INCIDENT, "id": "sentinel-003", "name": "Credential Dumping", "severity": "Medium"},
    ]
    batch = adapter.normalise(incidents, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert len(batch.hypotheses) == 2


def test_arm_properties_envelope(adapter: SentinelAdapter) -> None:
    """Adapter must handle nested ARM API format."""
    arm_incident = {
        "id": "/subscriptions/.../incidents/arm-001",
        "properties": {
            "incidentNumber": "arm-001",
            "title": "ARM Envelope Test Incident",
            "description": "Testing nested properties.",
            "severity": "Low",
            "status": "Active",
            "additionalData": {"tactics": ["LateralMovement"]},
        },
    }
    batch = adapter.normalise(arm_incident, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "low"
    assert batch.hypotheses[0].dedupe_key == "sentinel:arm-001"
