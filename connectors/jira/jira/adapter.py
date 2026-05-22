from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis

logger = logging.getLogger(__name__)

# Jira priority name → THMP severity
_PRIORITY_MAP: dict[str, str] = {
    "highest": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
    "lowest": "informational",
}


def _map_priority(priority_name: str) -> str:
    return _PRIORITY_MAP.get(str(priority_name).lower(), "medium")


def update_jira_status(
    issue_key: str,
    status: str,
    jira_url: str,
    token: str,
) -> None:
    """Stub: log intent to transition a Jira issue to a new status.

    A real implementation would POST to:
      {jira_url}/rest/api/3/issue/{issue_key}/transitions
    with the target status transition ID.
    """
    logger.info(
        "update_jira_status: would transition issue=%s to status=%s at %s (not implemented)",
        issue_key,
        status,
        jira_url,
    )


def add_jira_comment(
    issue_key: str,
    body: str,
    jira_url: str,
    token: str,
) -> None:
    """Stub: log intent to add a comment to a Jira issue.

    A real implementation would POST to:
      {jira_url}/rest/api/3/issue/{issue_key}/comment
    with the comment body.
    """
    logger.info(
        "add_jira_comment: would add comment to issue=%s at %s (not implemented)",
        issue_key,
        jira_url,
    )


def _normalise_issue(issue: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    issue_id = str(issue.get("id") or "")
    issue_key = str(issue.get("key") or "")
    summary = str(issue.get("summary") or "Unnamed Jira Issue")
    description = str(issue.get("description") or "")

    priority_field = issue.get("priority") or {}
    if isinstance(priority_field, dict):
        priority_name = str(priority_field.get("name") or "medium")
    else:
        priority_name = str(priority_field)

    severity = _map_priority(priority_name)

    return NormalisedHypothesis(
        title=summary[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="ticketing",
        source_ref={
            "jira_issue_id": issue_id,
            "jira_issue_key": issue_key,
            "jira_priority": priority_name,
        },
        metadata={"jira_priority": priority_name},
        dedupe_key=f"jira:{issue_key}"[:512],
        workspace_id=workspace_id,
    )


class JiraAdapter(ConnectorAdapter):
    connector_id = "jira"
    version = "0.1.0"

    def normalise(
        self,
        raw_payload: bytes | dict[str, Any] | list[dict[str, Any]],
        *,
        workspace_id: UUID,
        integration_config: dict[str, Any],
    ) -> NormalisedBatch:
        if isinstance(raw_payload, bytes):
            try:
                data = json.loads(raw_payload.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                logger.warning("jira: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            issues = [data]
        elif isinstance(data, list):
            issues = data
        else:
            logger.warning("jira: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [
            _normalise_issue(i, workspace_id) for i in issues if isinstance(i, dict)
        ]
        return NormalisedBatch(hypotheses=hypotheses)
