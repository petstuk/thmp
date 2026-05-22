from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from splunk_soar.adapter import SplunkSoarAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {
    "soar_url": "https://soar.example.com",
    "api_token": "soar-token",
}

HIGH_CONTAINER = {
    "id": "1001",
    "name": "Malware Detected on Endpoint",
    "description": "Endpoint security alert: malware binary executed on workstation.",
    "severity": "high",
}

MEDIUM_CONTAINER = {
    "id": "1002",
    "name": "Unusual Login Activity",
    "description": "Multiple logins from new geographic location.",
    "severity": "medium",
}

LOW_CONTAINER = {
    "id": "1003",
    "name": "Expired Certificate Warning",
    "description": "TLS certificate expiring in 7 days.",
    "severity": "low",
}


@pytest.fixture()
def adapter() -> SplunkSoarAdapter:
    return SplunkSoarAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_container_dict_produces_hypothesis(
    adapter: SplunkSoarAdapter, applier: MockBatchApplier
) -> None:
    batch = adapter.normalise(HIGH_CONTAINER, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 1


def test_severity_high(adapter: SplunkSoarAdapter) -> None:
    batch = adapter.normalise(HIGH_CONTAINER, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "high"


def test_severity_medium(adapter: SplunkSoarAdapter) -> None:
    batch = adapter.normalise(MEDIUM_CONTAINER, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "medium"


def test_severity_low(adapter: SplunkSoarAdapter) -> None:
    batch = adapter.normalise(LOW_CONTAINER, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "low"


def test_source_type_is_soar(adapter: SplunkSoarAdapter) -> None:
    batch = adapter.normalise(HIGH_CONTAINER, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].source_type == "soar"


def test_dedupe_key(adapter: SplunkSoarAdapter) -> None:
    batch = adapter.normalise(HIGH_CONTAINER, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "phantom:1001"


def test_source_ref_contains_container_id(adapter: SplunkSoarAdapter) -> None:
    batch = adapter.normalise(HIGH_CONTAINER, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    ref = batch.hypotheses[0].source_ref
    assert ref is not None
    assert ref["container_id"] == "1001"
    assert ref["soar_severity"] == "high"


def test_list_of_containers(adapter: SplunkSoarAdapter) -> None:
    batch = adapter.normalise(
        [HIGH_CONTAINER, MEDIUM_CONTAINER, LOW_CONTAINER],
        workspace_id=WORKSPACE_ID,
        integration_config=CONFIG,
    )
    assert len(batch.hypotheses) == 3
