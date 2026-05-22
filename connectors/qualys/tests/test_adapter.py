from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from qualys.adapter import QualysAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {
    "qualys_api_url": "https://qualysapi.qualys.com",
    "username": "qualys-user",
    "password": "qualys-pass",
}

CRITICAL_FINDING = {
    "qid": "90882",
    "asset_id": "asset-001",
    "asset_hostname": "web01.corp.example.com",
    "cve_id": "CVE-2021-44228",
    "cvss3_base_score": 10.0,
    "severity_level": 1,
}

HIGH_FINDING = {
    "qid": "12345",
    "asset_id": "asset-002",
    "asset_hostname": "db01.corp.example.com",
    "cve_id": "CVE-2022-22965",
    "cvss3_base_score": 9.8,
    "severity_level": 2,
}

LOW_FINDING = {
    "qid": "99001",
    "asset_id": "asset-003",
    "asset_hostname": "app03.corp.example.com",
    "cve_id": "",
    "cvss3_base_score": 3.1,
    "severity_level": 4,
}


@pytest.fixture()
def adapter() -> QualysAdapter:
    return QualysAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_critical_finding_creates_hypothesis(
    adapter: QualysAdapter, applier: MockBatchApplier
) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 1
    hyp = applier.applied_hypotheses[0]
    assert hyp.severity == "critical"


def test_critical_finding_has_attack_hints(adapter: QualysAdapter) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert "attack_hints" in hyp.metadata
    assert "T1190" in hyp.metadata["attack_hints"]
    assert "T1203" in hyp.metadata["attack_hints"]


def test_high_finding_has_attack_hints(adapter: QualysAdapter) -> None:
    batch = adapter.normalise(HIGH_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.severity == "high"
    assert "attack_hints" in hyp.metadata


def test_low_finding_no_attack_hints(adapter: QualysAdapter) -> None:
    batch = adapter.normalise(LOW_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.severity == "low"
    assert "attack_hints" not in hyp.metadata


def test_source_type(adapter: QualysAdapter) -> None:
    batch = adapter.normalise([CRITICAL_FINDING, LOW_FINDING], workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert all(h.source_type == "vuln_scanner" for h in batch.hypotheses)


def test_dedupe_key(adapter: QualysAdapter) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "qualys:asset-001:90882"


def test_source_ref_fields(adapter: QualysAdapter) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    ref = batch.hypotheses[0].source_ref
    assert ref is not None
    assert ref["qid"] == "90882"
    assert ref["asset_id"] == "asset-001"
    assert ref["cve_id"] == "CVE-2021-44228"


def test_list_payload(adapter: QualysAdapter) -> None:
    batch = adapter.normalise(
        [CRITICAL_FINDING, HIGH_FINDING, LOW_FINDING],
        workspace_id=WORKSPACE_ID,
        integration_config=CONFIG,
    )
    assert len(batch.hypotheses) == 3
