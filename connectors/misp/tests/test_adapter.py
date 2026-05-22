from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from misp.adapter import MispAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {"misp_url": "https://misp.example.com", "api_key": "misp-api-key"}

MISP_EVENT = {
    "uuid": "aabbccdd-0000-0000-0000-000000000001",
    "info": "APT29 Spearphishing Campaign",
    "description": "Observed spearphishing emails targeting energy sector.",
    "threat_level_id": "1",
    "Attribute": [
        {"uuid": "attr-001", "type": "ip-dst", "value": "1.2.3.4", "to_ids": True},
        {"uuid": "attr-002", "type": "domain", "value": "evil.example.com", "to_ids": True},
        {"uuid": "attr-003", "type": "sha256", "value": "abc123", "to_ids": False},
        # Non-IOC attribute — should NOT be extracted
        {"uuid": "attr-004", "type": "comment", "value": "See analyst notes", "to_ids": False},
    ],
    "Tag": [
        {"name": 'misp-galaxy:mitre-attack-pattern="T1566 - Phishing"'},
    ],
    "Galaxy": [],
}


@pytest.fixture()
def adapter() -> MispAdapter:
    return MispAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_normalise_produces_one_hypothesis(adapter: MispAdapter, applier: MockBatchApplier) -> None:
    batch = adapter.normalise(MISP_EVENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 1


def test_severity_mapping(adapter: MispAdapter) -> None:
    batch = adapter.normalise(MISP_EVENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "high"


def test_ioc_count(adapter: MispAdapter) -> None:
    batch = adapter.normalise(MISP_EVENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    # ip-dst, domain, sha256 → 3 IOCs (comment is excluded)
    assert len(batch.iocs) == 3


def test_ioc_types(adapter: MispAdapter) -> None:
    batch = adapter.normalise(MISP_EVENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    types = {ioc["type"] for ioc in batch.iocs}
    assert types == {"ip-dst", "domain", "sha256"}


def test_attack_hint_extracted(adapter: MispAdapter) -> None:
    batch = adapter.normalise(MISP_EVENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.metadata is not None
    assert "T1566" in hyp.metadata.get("attack_technique_hints", [])


def test_dedupe_key(adapter: MispAdapter) -> None:
    batch = adapter.normalise(MISP_EVENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "misp:aabbccdd-0000-0000-0000-000000000001"


def test_source_type(adapter: MispAdapter) -> None:
    batch = adapter.normalise(MISP_EVENT, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].source_type == "intel_feed"


def test_wrapped_event_format(adapter: MispAdapter) -> None:
    """normalise() must handle {"Event": {...}} wrapper."""
    wrapped = {"Event": MISP_EVENT}
    batch = adapter.normalise(wrapped, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert len(batch.hypotheses) == 1
    assert batch.hypotheses[0].severity == "high"
