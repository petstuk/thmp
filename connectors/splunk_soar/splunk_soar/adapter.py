from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis

logger = logging.getLogger(__name__)

_SEVERITY_MAP: dict[str, str] = {
    "high": "high",
    "medium": "medium",
    "low": "low",
}


def _map_severity(severity: str) -> str:
    return _SEVERITY_MAP.get(str(severity).lower(), "medium")


def trigger_action(
    container_id: str,
    action_name: str,
    soar_url: str,
    token: str,
) -> None:
    """Stub: log intent to trigger a Splunk SOAR playbook action on a container.

    A real implementation would POST to:
      {soar_url}/rest/action_run
    with the container_id and action_name.
    """
    logger.info(
        "trigger_action: would trigger action=%s on container_id=%s at %s (not implemented)",
        action_name,
        container_id,
        soar_url,
    )


def sync_container(container_id: str, soar_url: str, token: str) -> None:
    """Stub: log intent to sync container state from Splunk SOAR.

    A real implementation would GET:
      {soar_url}/rest/container/{container_id}
    and update the corresponding THMP hunt/hypothesis.
    """
    logger.info(
        "sync_container: would sync container_id=%s from %s (not implemented)",
        container_id,
        soar_url,
    )


def _normalise_container(container: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    container_id = str(container.get("id") or "")
    name = str(container.get("name") or "Unnamed SOAR Container")
    description = str(container.get("description") or "")
    severity = _map_severity(str(container.get("severity") or "medium"))

    return NormalisedHypothesis(
        title=name[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="soar",
        source_ref={
            "container_id": container_id,
            "soar_severity": str(container.get("severity") or "medium"),
        },
        metadata={"phantom_container_id": container_id},
        dedupe_key=f"phantom:{container_id}"[:512],
        workspace_id=workspace_id,
    )


class SplunkSoarAdapter(ConnectorAdapter):
    connector_id = "splunk_soar"
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
                logger.warning("splunk_soar: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            containers = [data]
        elif isinstance(data, list):
            containers = data
        else:
            logger.warning("splunk_soar: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [
            _normalise_container(c, workspace_id)
            for c in containers
            if isinstance(c, dict)
        ]
        return NormalisedBatch(hypotheses=hypotheses)
