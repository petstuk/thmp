from __future__ import annotations

import uuid

import pytest
from thmp_cdk import MockBatchApplier

from jira.adapter import JiraAdapter

WORKSPACE_ID = uuid.uuid4()
CONFIG = {
    "jira_url": "https://example.atlassian.net",
    "api_token": "jira-api-token",
    "user_email": "soc@example.com",
    "project_key": "SEC",
}

HIGHEST_ISSUE = {
    "id": "10001",
    "key": "SEC-42",
    "summary": "Critical infrastructure compromise detected",
    "description": "Attacker may have gained access to the core network infrastructure.",
    "priority": {"name": "Highest"},
}

HIGH_ISSUE = {
    "id": "10002",
    "key": "SEC-43",
    "summary": "Suspicious lateral movement on server",
    "description": "Unusual RDP connections between servers detected.",
    "priority": {"name": "High"},
}

MEDIUM_ISSUE = {
    "id": "10003",
    "key": "SEC-44",
    "summary": "Outdated software on endpoints",
    "description": "Endpoints running unsupported OS versions.",
    "priority": {"name": "Medium"},
}

LOW_ISSUE = {
    "id": "10004",
    "key": "SEC-45",
    "summary": "Failed login from known user",
    "description": "Single failed login from corporate VPN.",
    "priority": {"name": "Low"},
}

LOWEST_ISSUE = {
    "id": "10005",
    "key": "SEC-46",
    "summary": "Minor policy deviation detected",
    "description": "User installed unauthorized but benign software.",
    "priority": {"name": "Lowest"},
}


@pytest.fixture()
def adapter() -> JiraAdapter:
    return JiraAdapter()


@pytest.fixture()
def applier() -> MockBatchApplier:
    return MockBatchApplier()


def test_priority_highest_maps_to_critical(adapter: JiraAdapter) -> None:
    batch = adapter.normalise(HIGHEST_ISSUE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert len(batch.hypotheses) == 1
    assert batch.hypotheses[0].severity == "critical"


def test_priority_low_maps_to_low(adapter: JiraAdapter) -> None:
    batch = adapter.normalise(LOW_ISSUE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "low"


def test_priority_lowest_maps_to_informational(adapter: JiraAdapter) -> None:
    batch = adapter.normalise(LOWEST_ISSUE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "informational"


def test_priority_medium(adapter: JiraAdapter) -> None:
    batch = adapter.normalise(MEDIUM_ISSUE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].severity == "medium"


def test_source_type_is_ticketing(adapter: JiraAdapter) -> None:
    batch = adapter.normalise(HIGH_ISSUE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].source_type == "ticketing"


def test_dedupe_key(adapter: JiraAdapter) -> None:
    batch = adapter.normalise(HIGHEST_ISSUE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    assert batch.hypotheses[0].dedupe_key == "jira:SEC-42"


def test_source_ref_contains_issue_key(adapter: JiraAdapter) -> None:
    batch = adapter.normalise(HIGHEST_ISSUE, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    ref = batch.hypotheses[0].source_ref
    assert ref is not None
    assert ref["jira_issue_key"] == "SEC-42"
    assert ref["jira_issue_id"] == "10001"
    assert ref["jira_priority"] == "Highest"


def test_list_of_issues(adapter: JiraAdapter, applier: MockBatchApplier) -> None:
    issues = [HIGHEST_ISSUE, HIGH_ISSUE, MEDIUM_ISSUE, LOW_ISSUE, LOWEST_ISSUE]
    batch = adapter.normalise(issues, workspace_id=WORKSPACE_ID, integration_config=CONFIG)
    applier.apply(batch)
    assert len(applier.applied_hypotheses) == 5
