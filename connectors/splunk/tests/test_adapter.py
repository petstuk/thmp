from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from splunk.adapter import SplunkEsAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {"splunk_url": "https://splunk.example.com:8089", "api_token": "splunk-token"}

NOTABLE_EVENTS = [
    {
        "event_id": "notable-001",
        "rule_name": "Brute Force Login Detected",
        "description": "Multiple failed logins from single source IP.",
        "urgency": "high",
        "search_name": "Access - Brute Force Access Behavior Detected - Rule",
        "event_hash": "abc123def456",
    },
    {
        "event_id": "notable-002",
        "rule_name": "Lateral Movement Detected",
        "description": "SMB traffic to multiple hosts in short timeframe.",
        "urgency": "critical",
        "search_name": "Network - Lateral Movement Detected - Rule",
        "event_hash": "xyz789uvw012",
    },
]


@pytest.fixture()
def adapter() -> SplunkEsAdapter:
    return SplunkEsAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_two_notables_produce_two_hypotheses(
    adapter: SplunkEsAdapter, applier: MockBatchApplier
) -> None:
    batch = adapter.normalise(NOTABLE_EVENTS, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 2


def test_severity_high(adapter: SplunkEsAdapter) -> None:
    batch = adapter.normalise(NOTABLE_EVENTS, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = next(h for h in batch.hypotheses if h.dedupe_key == "splunk:notable-001")
    assert hyp.severity == "high"


def test_severity_critical(adapter: SplunkEsAdapter) -> None:
    batch = adapter.normalise(NOTABLE_EVENTS, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = next(h for h in batch.hypotheses if h.dedupe_key == "splunk:notable-002")
    assert hyp.severity == "critical"


def test_source_type(adapter: SplunkEsAdapter) -> None:
    batch = adapter.normalise(NOTABLE_EVENTS, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert all(h.source_type == "siem" for h in batch.hypotheses)


def test_source_ref_fields(adapter: SplunkEsAdapter) -> None:
    batch = adapter.normalise(NOTABLE_EVENTS[:1], workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    hyp = batch.hypotheses[0]
    assert hyp.source_ref is not None
    assert hyp.source_ref["event_id"] == "notable-001"
    assert hyp.source_ref["search_name"] == "Access - Brute Force Access Behavior Detected - Rule"
    assert hyp.source_ref["event_hash"] == "abc123def456"


def test_dedupe_key(adapter: SplunkEsAdapter) -> None:
    batch = adapter.normalise(NOTABLE_EVENTS[:1], workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "splunk:notable-001"


def test_single_dict_accepted(adapter: SplunkEsAdapter) -> None:
    batch = adapter.normalise(NOTABLE_EVENTS[0], workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert len(batch.hypotheses) == 1
