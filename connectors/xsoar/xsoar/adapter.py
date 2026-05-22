from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis

logger = logging.getLogger(__name__)

# XSOAR numeric severity → THMP severity
# 0=Unknown, 1=Informational, 2=Low, 3=Medium, 4=High, 5=Critical
_SEVERITY_MAP: dict[int, str] = {
    0: "medium",
    1: "informational",
    2: "low",
    3: "medium",
    4: "high",
    5: "critical",
}


def _map_severity(level: int) -> str:
    return _SEVERITY_MAP.get(level, "medium")


def trigger_playbook(
    incident_id: str,
    playbook_id: str,
    xsoar_url: str,
    api_key: str,
) -> None:
    """Stub: log intent to trigger an XSOAR playbook on a given incident.

    A real implementation would POST to:
      {xsoar_url}/incident/investigate
    with the incident_id and playbook_id.
    """
    logger.info(
        "trigger_playbook: would trigger playbook_id=%s on incident_id=%s at %s (not implemented)",
        playbook_id,
        incident_id,
        xsoar_url,
    )


def _normalise_incident(incident: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    incident_id = str(incident.get("id") or "")
    name = str(incident.get("name") or "Unnamed XSOAR Incident")
    details = str(incident.get("details") or "")
    severity_level = int(incident.get("severity") or 0)

    severity = _map_severity(severity_level)

    return NormalisedHypothesis(
        title=name[:256],
        description=details[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="soar",
        source_ref={
            "incident_id": incident_id,
            "xsoar_severity": severity_level,
        },
        metadata={"xsoar_severity_level": severity_level},
        dedupe_key=f"xsoar:{incident_id}"[:512],
        workspace_id=workspace_id,
    )


class XsoarAdapter(ConnectorAdapter):
    connector_id = "palo_alto_xsoar"
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
                logger.warning("palo_alto_xsoar: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            incidents = [data]
        elif isinstance(data, list):
            incidents = data
        else:
            logger.warning("palo_alto_xsoar: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [
            _normalise_incident(inc, workspace_id)
            for inc in incidents
            if isinstance(inc, dict)
        ]
        return NormalisedBatch(hypotheses=hypotheses)
