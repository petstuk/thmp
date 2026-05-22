from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from qradar.adapter import QRadarAdapter
from qradar.schemas import qradar_severity_to_thmp

WORKSPACE_ID = uuid.uuid4()
CONFIG = {"qradar_url": "https://qradar.example.com", "api_key": "qradar-sec-token"}

OFFENCES = [
    {
        "id": "1001",
        "description": "Multiple failed login attempts from external IP\nRule: Brute Force Detected",
        "rules": ["Brute Force Detected", "Authentication Anomaly"],
        "severity": 2,
    },
    {
        "id": "1002",
        "description": "Ransomware encryption activity detected on endpoint",
        "rules": ["Ransomware Activity"],
        "severity": 9,
    },
]


@pytest.fixture()
def adapter() -> QRadarAdapter:
    return QRadarAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_two_offences_produce_two_hypotheses(
    adapter: QRadarAdapter, applier: MockBatchApplier
) -> None:
    batch = adapter.normalise(OFFENCES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 2


def test_severity_2_maps_to_low(adapter: QRadarAdapter) -> None:
    batch = adapter.normalise(OFFENCES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = next(h for h in batch.hypotheses if h.dedupe_key == "qradar:1001")
    assert hyp.severity == "low"


def test_severity_9_maps_to_critical(adapter: QRadarAdapter) -> None:
    batch = adapter.normalise(OFFENCES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = next(h for h in batch.hypotheses if h.dedupe_key == "qradar:1002")
    assert hyp.severity == "critical"


def test_severity_mapping_function() -> None:
    assert qradar_severity_to_thmp(0) == "low"
    assert qradar_severity_to_thmp(3) == "low"
    assert qradar_severity_to_thmp(4) == "medium"
    assert qradar_severity_to_thmp(6) == "medium"
    assert qradar_severity_to_thmp(7) == "high"
    assert qradar_severity_to_thmp(8) == "high"
    assert qradar_severity_to_thmp(9) == "critical"
    assert qradar_severity_to_thmp(10) == "critical"


def test_source_type(adapter: QRadarAdapter) -> None:
    batch = adapter.normalise(OFFENCES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert all(h.source_type == "siem" for h in batch.hypotheses)


def test_source_ref_rules(adapter: QRadarAdapter) -> None:
    batch = adapter.normalise(OFFENCES[:1], workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.source_ref is not None
    assert "Brute Force Detected" in hyp.source_ref["rules"]


def test_dedupe_key_format(adapter: QRadarAdapter) -> None:
    batch = adapter.normalise(OFFENCES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    keys = {h.dedupe_key for h in batch.hypotheses}
    assert "qradar:1001" in keys
    assert "qradar:1002" in keys
