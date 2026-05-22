from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from elastic_scm.adapter import ElasticScmAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {"scm_base_url": "https://scm.example.com", "api_key": "test-key"}

RAW_FINDINGS = [
    {
        "finding_id": "scm-001",
        "title": "Malicious package detected in lodash@4.17.15",
        "description": "Backdoor code found in supply chain dependency.",
        "severity": "critical",
        "repo": "my-org/frontend",
        "package": "lodash",
    },
    {
        "finding_id": "scm-002",
        "title": "Outdated dependency with known CVE",
        "description": "Dependency has a known medium-severity CVE.",
        "severity": "medium",
        "repo": "my-org/backend",
        "package": "requests",
    },
]


@pytest.fixture()
def adapter() -> ElasticScmAdapter:
    return ElasticScmAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_normalise_two_findings(adapter: ElasticScmAdapter, applier: MockBatchApplier) -> None:
    batch = adapter.normalise(RAW_FINDINGS, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)

    assert len(applier.applied_hypotheses) == 2


def test_severity_mapping(adapter: ElasticScmAdapter, applier: MockBatchApplier) -> None:
    batch = adapter.normalise(RAW_FINDINGS, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)

    severities = {h.dedupe_key: h.severity for h in applier.applied_hypotheses}
    assert severities["elastic_scm:scm-001"] == "critical"
    assert severities["elastic_scm:scm-002"] == "medium"


def test_attack_hint_present(adapter: ElasticScmAdapter) -> None:
    batch = adapter.normalise(RAW_FINDINGS[:1], workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.metadata is not None
    assert "T1195" in hyp.metadata["attack_technique_hints"]


def test_source_ref(adapter: ElasticScmAdapter) -> None:
    batch = adapter.normalise(RAW_FINDINGS[:1], workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.source_ref is not None
    assert hyp.source_ref["scm_finding_id"] == "scm-001"
    assert hyp.source_ref["repo"] == "my-org/frontend"
    assert hyp.source_ref["package"] == "lodash"


def test_dedupe_key(adapter: ElasticScmAdapter) -> None:
    batch = adapter.normalise(RAW_FINDINGS[:1], workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "elastic_scm:scm-001"


def test_single_finding_dict(adapter: ElasticScmAdapter) -> None:
    """normalise() must also accept a single dict (webhook push mode)."""
    batch = adapter.normalise(RAW_FINDINGS[0], workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert len(batch.hypotheses) == 1


def test_info_severity_maps_to_informational(adapter: ElasticScmAdapter) -> None:
    finding = {**RAW_FINDINGS[0], "finding_id": "scm-003", "severity": "info"}
    batch = adapter.normalise(finding, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "informational"
