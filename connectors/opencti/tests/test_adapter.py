from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from opencti.adapter import OpenCtiAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {"opencti_url": "https://opencti.example.com", "api_key": "opencti-token"}

ENTITIES = [
    {
        "id": "opencti-report-001",
        "entity_type": "Report",
        "name": "APT28 Activity Report Q1",
        "description": "Comprehensive analysis of recent APT28 activity.",
        "confidence": 80,
        "kill_chain_phases": [
            {"kill_chain_name": "mitre-attack", "phase_name": "initial-access"},
        ],
    },
    {
        "id": "opencti-indicator-002",
        "entity_type": "Indicator",
        "name": "C2 Domain evil.apt28.com",
        "description": "Observed C2 domain for APT28 implant.",
        "confidence": 55,
        "kill_chain_phases": [
            {"kill_chain_name": "mitre-attack", "phase_name": "command-and-control"},
        ],
    },
]


@pytest.fixture()
def adapter() -> OpenCtiAdapter:
    return OpenCtiAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_two_entities_produce_two_hypotheses(
    adapter: OpenCtiAdapter, applier: MockBatchApplier
) -> None:
    batch = adapter.normalise(ENTITIES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 2


def test_report_severity_high(adapter: OpenCtiAdapter) -> None:
    batch = adapter.normalise(ENTITIES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    report_hyp = next(h for h in batch.hypotheses if "Report" in h.title)
    assert report_hyp.severity == "high"


def test_indicator_severity_medium(adapter: OpenCtiAdapter) -> None:
    batch = adapter.normalise(ENTITIES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    ind_hyp = next(h for h in batch.hypotheses if "Indicator" in h.title)
    assert ind_hyp.severity == "medium"


def test_tactic_hints_extracted(adapter: OpenCtiAdapter) -> None:
    batch = adapter.normalise(ENTITIES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    report_hyp = next(h for h in batch.hypotheses if "Report" in h.title)
    assert report_hyp.metadata is not None
    assert "Initial Access" in report_hyp.metadata.get("attack_tactic_hints", [])


def test_dedupe_key_format(adapter: OpenCtiAdapter) -> None:
    batch = adapter.normalise(ENTITIES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    keys = {h.dedupe_key for h in batch.hypotheses}
    assert "opencti:opencti-report-001" in keys
    assert "opencti:opencti-indicator-002" in keys


def test_source_type(adapter: OpenCtiAdapter) -> None:
    batch = adapter.normalise(ENTITIES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert all(h.source_type == "intel_feed" for h in batch.hypotheses)


def test_source_ref_entity_type(adapter: OpenCtiAdapter) -> None:
    batch = adapter.normalise(ENTITIES, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    report_hyp = next(h for h in batch.hypotheses if "Report" in h.title)
    assert report_hyp.source_ref is not None
    assert report_hyp.source_ref["entity_type"] == "report"


def test_unsupported_type_skipped(adapter: OpenCtiAdapter) -> None:
    entities = [
        *ENTITIES,
        {"id": "opencti-rel-003", "entity_type": "Relationship", "name": "rel", "confidence": 50},
    ]
    batch = adapter.normalise(entities, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert len(batch.hypotheses) == 2


def test_low_confidence_severity(adapter: OpenCtiAdapter) -> None:
    entity = [{**ENTITIES[0], "id": "opencti-low-004", "confidence": 20}]
    batch = adapter.normalise(entity, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "low"
