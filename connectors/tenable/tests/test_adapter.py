from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from tenable.adapter import TenableAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {
    "access_key": "tenable-access-key",
    "secret_key": "tenable-secret-key",
    "api_url": "https://cloud.tenable.com",
}

CRITICAL_FINDING = {
    "asset_id": "asset-aabbcc",
    "asset_hostname": "web-prod-01.example.com",
    "cve_id": "CVE-2021-44228",
    "cvss3_base_score": 10.0,
    "severity": "critical",
}

HIGH_FINDING = {
    "asset_id": "asset-ddeeff",
    "asset_hostname": "db-prod-02.example.com",
    "cve_id": "CVE-2022-22965",
    "cvss3_base_score": 8.1,
    "severity": "high",
}

MEDIUM_FINDING = {
    "asset_id": "asset-112233",
    "asset_hostname": "app-staging-03.example.com",
    "cve_id": "CVE-2023-12345",
    "cvss3_base_score": 5.3,
    "severity": "medium",
}


@pytest.fixture()
def adapter() -> TenableAdapter:
    return TenableAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_critical_finding_produces_one_hypothesis(
    adapter: TenableAdapter, applier: MockBatchApplier
) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 1


def test_critical_severity(adapter: TenableAdapter) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "critical"


def test_high_severity(adapter: TenableAdapter) -> None:
    batch = adapter.normalise(HIGH_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "high"


def test_medium_no_attack_hints(adapter: TenableAdapter) -> None:
    batch = adapter.normalise(MEDIUM_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    hints = (hyp.metadata or {}).get("attack_technique_hints", [])
    assert hints == []


def test_critical_has_t1190_hint(adapter: TenableAdapter) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.metadata is not None
    assert "T1190" in hyp.metadata["attack_technique_hints"]


def test_critical_has_t1203_hint(adapter: TenableAdapter) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.metadata is not None
    assert "T1203" in hyp.metadata["attack_technique_hints"]


def test_high_has_attack_hints(adapter: TenableAdapter) -> None:
    batch = adapter.normalise(HIGH_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.metadata is not None
    hints = hyp.metadata.get("attack_technique_hints", [])
    assert "T1190" in hints
    assert "T1203" in hints


def test_source_type(adapter: TenableAdapter) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].source_type == "vuln_scanner"


def test_dedupe_key(adapter: TenableAdapter) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "tenable:asset-aabbcc:CVE-2021-44228"


def test_source_ref(adapter: TenableAdapter) -> None:
    batch = adapter.normalise(CRITICAL_FINDING, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.source_ref is not None
    assert hyp.source_ref["asset_id"] == "asset-aabbcc"
    assert hyp.source_ref["cve_id"] == "CVE-2021-44228"


def test_list_of_findings(adapter: TenableAdapter) -> None:
    findings = [CRITICAL_FINDING, HIGH_FINDING, MEDIUM_FINDING]
    batch = adapter.normalise(findings, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert len(batch.hypotheses) == 3
