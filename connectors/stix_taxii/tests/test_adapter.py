from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from stix_taxii.adapter import StixTaxiiAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {
    "taxii_base_url": "https://taxii.example.com",
    "taxii_username": "user",
    "taxii_password": "pass",
}

STIX_BUNDLE = {
    "type": "bundle",
    "id": "bundle--12345678-1234-1234-1234-123456789abc",
    "objects": [
        {
            "type": "indicator",
            "id": "indicator--aaaa0001-0000-0000-0000-000000000001",
            "name": "Malicious IP 1.2.3.4",
            "description": "C2 server observed in the wild.",
            "confidence": 90,
            "external_references": [
                {
                    "source_name": "mitre-attack",
                    "external_id": "T1071",
                    "url": "https://attack.mitre.org/techniques/T1071",
                }
            ],
            "labels": ["malicious-activity"],
        },
        {
            "type": "attack-pattern",
            "id": "attack-pattern--bbbb0001-0000-0000-0000-000000000002",
            "name": "Spearphishing Attachment",
            "description": "Adversaries may send spearphishing emails.",
            "confidence": 60,
            "external_references": [],
            "labels": [],
        },
        {
            # unsupported type — must be skipped
            "type": "relationship",
            "id": "relationship--cccc0001-0000-0000-0000-000000000003",
        },
    ],
}


@pytest.fixture()
def adapter() -> StixTaxiiAdapter:
    return StixTaxiiAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_normalise_bundle_produces_two_hypotheses(
    adapter: StixTaxiiAdapter, applier: MockBatchApplier
) -> None:
    batch = adapter.normalise(STIX_BUNDLE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)

    assert len(applier.applied_hypotheses) == 2


def test_indicator_severity_high(adapter: StixTaxiiAdapter) -> None:
    batch = adapter.normalise(STIX_BUNDLE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    indicator_hyp = next(
        h for h in batch.hypotheses if "indicator" in h.dedupe_key
    )
    assert indicator_hyp.severity == "high"


def test_attack_pattern_severity_medium(adapter: StixTaxiiAdapter) -> None:
    batch = adapter.normalise(STIX_BUNDLE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    ap_hyp = next(h for h in batch.hypotheses if "attack-pattern" in h.dedupe_key)
    assert ap_hyp.severity == "medium"


def test_attack_hint_extracted(adapter: StixTaxiiAdapter) -> None:
    batch = adapter.normalise(STIX_BUNDLE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    indicator_hyp = next(h for h in batch.hypotheses if "indicator" in h.dedupe_key)
    assert indicator_hyp.metadata is not None
    assert "T1071" in indicator_hyp.metadata.get("attack_technique_hints", [])


def test_dedupe_key_format(adapter: StixTaxiiAdapter) -> None:
    batch = adapter.normalise(STIX_BUNDLE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    keys = {h.dedupe_key for h in batch.hypotheses}
    assert "stix:indicator--aaaa0001-0000-0000-0000-000000000001" in keys


def test_source_type(adapter: StixTaxiiAdapter) -> None:
    batch = adapter.normalise(STIX_BUNDLE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert all(h.source_type == "intel_feed" for h in batch.hypotheses)


def test_low_confidence_severity(adapter: StixTaxiiAdapter) -> None:
    bundle = {
        "type": "bundle",
        "id": "bundle--low",
        "objects": [
            {
                "type": "malware",
                "id": "malware--dddd0001-0000-0000-0000-000000000004",
                "name": "LowConfidenceMalware",
                "confidence": 30,
                "external_references": [],
            }
        ],
    }
    batch = adapter.normalise(bundle, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "low"
