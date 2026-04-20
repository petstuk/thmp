"""Unit tests for STIX bundle parsing (no network)."""

from __future__ import annotations

from app.stix_parse import extract_bundle_attack_version, parse_enterprise_bundle


def test_extract_bundle_attack_version_from_collection() -> None:
    data = {
        "type": "bundle",
        "objects": [
            {"type": "x-mitre-collection", "id": "c1", "x_mitre_version": "14.2"},
        ],
    }
    assert extract_bundle_attack_version(data) == "14.2"


def test_parse_enterprise_bundle_minimal() -> None:
    objects = [
        {"type": "x-mitre-collection", "id": "c1", "x_mitre_version": "99.0"},
        {
            "type": "x-mitre-tactic",
            "id": "tactic--1",
            "name": "Discovery",
            "x_mitre_shortname": "discovery",
            "description": "Tactic desc",
        },
        {
            "type": "attack-pattern",
            "id": "ap--1",
            "name": "Test Technique",
            "description": "d",
            "external_references": [{"source_name": "mitre-attack", "external_id": "T9999"}],
            "kill_chain_phases": [{"kill_chain_name": "mitre-attack", "phase_name": "discovery"}],
        },
    ]
    tactics, techniques, parents = parse_enterprise_bundle(objects)
    assert len(tactics) == 1
    assert tactics[0]["short_name"] == "discovery"
    assert len(techniques) == 1
    assert techniques[0]["mitre_id"] == "T9999"
    assert techniques[0]["tactic_short_names"] == ["discovery"]
    assert parents == {}
