from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis
from sentinel.schemas import SENTINEL_SEVERITY_MAP

logger = logging.getLogger(__name__)


def _map_severity(sentinel_severity: str) -> str:
    return SENTINEL_SEVERITY_MAP.get(sentinel_severity, "medium")


def _normalise_incident(incident: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    # Azure Resource Manager id or properties.incidentNumber
    incident_id = str(incident.get("id") or incident.get("name") or "")
    name = str(incident.get("name") or "")
    description = str(incident.get("description") or "")
    sentinel_severity = str(incident.get("severity") or "Informational")
    status = str(incident.get("status") or "")

    # Support nested properties envelope from ARM API
    properties: dict[str, Any] = incident.get("properties") or {}
    if properties:
        incident_id = str(properties.get("incidentNumber") or incident_id)
        name = str(properties.get("title") or name)
        description = str(properties.get("description") or description)
        sentinel_severity = str(properties.get("severity") or sentinel_severity)
        status = str(properties.get("status") or status)

    additional_data: dict[str, Any] = (
        incident.get("additionalData") or properties.get("additionalData") or {}
    )
    tactics: list[str] = additional_data.get("tactics") or []

    severity = _map_severity(sentinel_severity)

    metadata: dict[str, Any] = {"sentinel_status": status}
    if tactics:
        metadata["attack_tactic_hints"] = tactics

    return NormalisedHypothesis(
        title=name[:256] if name else f"Sentinel Incident {incident_id}"[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="siem",
        source_ref={"incident_id": incident_id, "sentinel_severity": sentinel_severity},
        metadata=metadata,
        dedupe_key=f"sentinel:{incident_id}"[:512],
        workspace_id=workspace_id,
    )


def create_sentinel_incident(
    finding: dict[str, Any],
    tenant_id: str,
    workspace_name: str,
    token: str,
) -> None:
    """Stub: log intent to create a Microsoft Sentinel incident from a THMP finding.

    A real implementation would call the Azure Sentinel Incidents API:
      PUT https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/
          providers/Microsoft.OperationalInsights/workspaces/{ws}/
          providers/Microsoft.SecurityInsights/incidents/{id}
    """
    logger.info(
        "create_sentinel_incident: would create incident for finding id=%s "
        "in workspace=%s tenant=%s (not implemented)",
        finding.get("id"),
        workspace_name,
        tenant_id,
    )


class SentinelAdapter(ConnectorAdapter):
    connector_id = "microsoft_sentinel"
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
                logger.warning("microsoft_sentinel: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            incidents = [data]
        elif isinstance(data, list):
            incidents = data
        else:
            logger.warning("microsoft_sentinel: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [
            _normalise_incident(i, workspace_id) for i in incidents if isinstance(i, dict)
        ]
        return NormalisedBatch(hypotheses=hypotheses)
