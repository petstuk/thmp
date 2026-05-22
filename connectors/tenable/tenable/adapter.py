from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis
from tenable.schemas import HIGH_SEVERITY_ATTACK_HINTS, TENABLE_SEVERITY_MAP

logger = logging.getLogger(__name__)

DEFAULT_API_URL = "https://cloud.tenable.com"


def _map_severity(tenable_severity: str) -> str:
    return TENABLE_SEVERITY_MAP.get(str(tenable_severity).lower(), "medium")


def _normalise_finding(finding: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    asset_id = str(finding.get("asset_id") or "")
    asset_hostname = str(finding.get("asset_hostname") or finding.get("hostname") or "unknown-host")
    cve_id = str(finding.get("cve_id") or finding.get("cve") or "")
    cvss3 = finding.get("cvss3_base_score") or finding.get("cvss3_score")
    tenable_severity = str(finding.get("severity") or "medium")

    severity = _map_severity(tenable_severity)

    title = f"[{severity.upper()}] {cve_id} on {asset_hostname}"
    description_parts = [f"CVE: {cve_id}", f"Asset: {asset_hostname} ({asset_id})"]
    if cvss3 is not None:
        description_parts.append(f"CVSS3 Base Score: {cvss3}")
    description = "\n".join(description_parts)

    metadata: dict[str, Any] = {
        "cvss3_base_score": cvss3,
        "asset_hostname": asset_hostname,
    }

    if severity in ("critical", "high"):
        metadata["attack_technique_hints"] = HIGH_SEVERITY_ATTACK_HINTS
        metadata["attack_technique_names"] = [
            "Exploit Public-Facing Application",
            "Exploitation for Client Execution",
        ]

    return NormalisedHypothesis(
        title=title[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="vuln_scanner",
        source_ref={
            "asset_id": asset_id,
            "cve_id": cve_id,
            "asset_hostname": asset_hostname,
        },
        metadata=metadata,
        dedupe_key=f"tenable:{asset_id}:{cve_id}"[:512],
        workspace_id=workspace_id,
    )


class TenableAdapter(ConnectorAdapter):
    connector_id = "tenable_io"
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
                logger.warning("tenable_io: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            findings = [data]
        elif isinstance(data, list):
            findings = data
        else:
            logger.warning("tenable_io: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [
            _normalise_finding(f, workspace_id) for f in findings if isinstance(f, dict)
        ]
        return NormalisedBatch(hypotheses=hypotheses)
