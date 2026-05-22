from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis

logger = logging.getLogger(__name__)

# Qualys severity_level → THMP severity
_SEVERITY_MAP: dict[int, str] = {
    1: "critical",
    2: "high",
    3: "medium",
    4: "low",
    5: "informational",
}

# ATT&CK technique hints for high-severity vulnerabilities
_HIGH_SEVERITY_ATTACK_HINTS = ["T1190", "T1203"]


def _map_severity(level: int) -> str:
    return _SEVERITY_MAP.get(level, "medium")


def _normalise_finding(finding: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    qid = str(finding.get("qid") or "")
    asset_id = str(finding.get("asset_id") or "")
    hostname = str(finding.get("asset_hostname") or "")
    cve_id = str(finding.get("cve_id") or "")
    cvss3 = finding.get("cvss3_base_score")
    severity_level = int(finding.get("severity_level") or 3)

    severity = _map_severity(severity_level)

    title = f"Qualys: QID {qid} on {hostname or asset_id}"
    description_parts = [f"Asset: {hostname or asset_id}", f"QID: {qid}"]
    if cve_id:
        description_parts.append(f"CVE: {cve_id}")
    if cvss3 is not None:
        description_parts.append(f"CVSS3 base score: {cvss3}")
    description = " | ".join(description_parts)

    metadata: dict[str, Any] = {
        "severity_level": severity_level,
        "cvss3_base_score": cvss3,
    }
    if severity_level in (1, 2):
        metadata["attack_hints"] = _HIGH_SEVERITY_ATTACK_HINTS

    return NormalisedHypothesis(
        title=title[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="vuln_scanner",
        source_ref={
            "qid": qid,
            "asset_id": asset_id,
            "asset_hostname": hostname,
            "cve_id": cve_id,
            "cvss3_base_score": cvss3,
        },
        metadata=metadata,
        dedupe_key=f"qualys:{asset_id}:{qid}"[:512],
        workspace_id=workspace_id,
    )


class QualysAdapter(ConnectorAdapter):
    connector_id = "qualys"
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
                logger.warning("qualys: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            findings = [data]
        elif isinstance(data, list):
            findings = data
        else:
            logger.warning("qualys: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [
            _normalise_finding(f, workspace_id) for f in findings if isinstance(f, dict)
        ]
        return NormalisedBatch(hypotheses=hypotheses)
