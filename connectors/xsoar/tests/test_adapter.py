from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from xsoar.adapter import XsoarAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {
    "xsoar_url": "https://xsoar.example.com",
    "api_key": "xsoar-api-key",
    "playbook_id": "Phishing Investigation",
}

HIGH_INCIDENT = {
    "id": "inc-101",
    "name": "Suspicious Phishing Email",
    "details": "User reported a phishing email with a malicious link.",
    "severity": 4,
}

INFORMATIONAL_INCIDENT = {
    "id": "inc-102",
    "name": "Routine Policy Scan",
    "details": "Automated policy compliance scan result.",
    "severity": 1,
}

CRITICAL_INCIDENT = {
    "id": "inc-103",
    "name": "Active Ransomware Detected",
    "details": "Ransomware encryption detected on endpoint.",
    "severity": 5,
}


@pytest.fixture()
def adapter() -> XsoarAdapter:
    return XsoarAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_severity_four_maps_to_high(adapter: XsoarAdapter) -> None:
    batch = adapter.normalise(HIGH_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert len(batch.hypotheses) == 1
    assert batch.hypotheses[0].severity == "high"


def test_severity_one_maps_to_informational(adapter: XsoarAdapter) -> None:
    batch = adapter.normalise(
        INFORMATIONAL_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG
    )
    assert batch.hypotheses[0].severity == "informational"


def test_severity_five_maps_to_critical(adapter: XsoarAdapter) -> None:
    batch = adapter.normalise(CRITICAL_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "critical"


def test_source_type_is_soar(adapter: XsoarAdapter) -> None:
    batch = adapter.normalise(HIGH_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].source_type == "soar"


def test_dedupe_key(adapter: XsoarAdapter) -> None:
    batch = adapter.normalise(HIGH_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "xsoar:inc-101"


def test_source_ref_contains_incident_id(adapter: XsoarAdapter) -> None:
    batch = adapter.normalise(HIGH_INCIDENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    ref = batch.hypotheses[0].source_ref
    assert ref is not None
    assert ref["incident_id"] == "inc-101"
    assert ref["xsoar_severity"] == 4


def test_list_of_incidents(adapter: XsoarAdapter, applier: MockBatchApplier) -> None:
    batch = adapter.normalise(
        [HIGH_INCIDENT, INFORMATIONAL_INCIDENT, CRITICAL_INCIDENT],
        workspace_id=WORKSPACE_ID,
        integration_config=CONFIG,
    )
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 3
