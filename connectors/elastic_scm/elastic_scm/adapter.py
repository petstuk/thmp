from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis

logger = logging.getLogger(__name__)

_SCM_SEVERITY_MAP: dict[str, str] = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
    "info": "informational",
}

_ATTACK_HINT = "T1195"  # Supply Chain Compromise


def _map_severity(vendor_severity: str) -> str:
    return _SCM_SEVERITY_MAP.get(str(vendor_severity).lower(), "medium")


def _normalise_finding(finding: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    finding_id = str(finding.get("finding_id") or finding.get("id") or "")
    title = str(finding.get("title") or "Untitled SCM Finding")
    description = str(finding.get("description") or "")
    severity = _map_severity(finding.get("severity") or "medium")
    repo = str(finding.get("repo") or "")
    package = str(finding.get("package") or "")

    return NormalisedHypothesis(
        title=title[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="scm",
        source_ref={
            "scm_finding_id": finding_id,
            "repo": repo,
            "package": package,
        },
        metadata={
            "attack_technique_hints": [_ATTACK_HINT],
            "attack_technique_names": ["Supply Chain Compromise"],
        },
        dedupe_key=f"elastic_scm:{finding_id}"[:512],
        workspace_id=workspace_id,
    )


def post_confirmation(finding_id: str, scm_base_url: str, api_key: str) -> None:
    """Notify the upstream SCM that a finding has been validated.

    Set ``THMP_CONNECTOR_LIVE_HTTP=1`` to perform the POST; otherwise only logs.
    """
    import os

    url = f"{scm_base_url.rstrip('/')}/api/v1/findings/{finding_id}/confirm"
    if os.environ.get("THMP_CONNECTOR_LIVE_HTTP") != "1":
        logger.info("SCM confirm skipped (set THMP_CONNECTOR_LIVE_HTTP=1): POST %s", url)
        return
    import httpx

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    resp = httpx.post(url, headers=headers, timeout=10)
    resp.raise_for_status()
    logger.info("SCM finding %s confirmed (HTTP %s)", finding_id, resp.status_code)


class ElasticScmAdapter(ConnectorAdapter):
    connector_id = "elastic_scm"
    version = "0.1.0"

    def normalise(
        self,
        raw_payload: bytes | dict[str, Any],
        *,
        workspace_id: UUID,
        integration_config: dict[str, Any],
    ) -> NormalisedBatch:
        if isinstance(raw_payload, bytes):
            try:
                data = json.loads(raw_payload.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                logger.warning("elastic_scm: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        # Accept either a single finding dict or a list (poll batch)
        if isinstance(data, dict):
            findings = [data]
        elif isinstance(data, list):
            findings = data
        else:
            logger.warning("elastic_scm: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [_normalise_finding(f, workspace_id) for f in findings if isinstance(f, dict)]
        return NormalisedBatch(hypotheses=hypotheses)
