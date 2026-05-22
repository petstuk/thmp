from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis
from splunk.schemas import URGENCY_MAP

logger = logging.getLogger(__name__)


def _map_urgency(urgency: str) -> str:
    return URGENCY_MAP.get(str(urgency).lower(), "medium")


def _normalise_notable(event: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    event_id = str(event.get("event_id") or event.get("notable_id") or "")
    rule_name = str(event.get("rule_name") or event.get("search_name") or "Unnamed Notable")
    description = str(event.get("description") or event.get("rule_description") or "")
    urgency = str(event.get("urgency") or "medium")
    search_name = str(event.get("search_name") or rule_name)
    event_hash = str(event.get("event_hash") or "")

    severity = _map_urgency(urgency)

    return NormalisedHypothesis(
        title=rule_name[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="siem",
        source_ref={
            "event_id": event_id,
            "search_name": search_name,
            "event_hash": event_hash,
        },
        metadata={"urgency": urgency},
        dedupe_key=f"splunk:{event_id}"[:512],
        workspace_id=workspace_id,
    )


def create_notable_from_finding(finding: dict[str, Any], splunk_base: str, token: str) -> None:
    """Stub: log intent to create a Splunk ES notable event from a THMP finding.

    A real implementation would POST to:
      {splunk_base}/services/alerts/fired_alerts
    with the finding serialised as a Splunk alert payload.
    """
    logger.info(
        "create_notable_from_finding: would create notable for finding id=%s at %s (not implemented)",
        finding.get("id"),
        splunk_base,
    )


class SplunkEsAdapter(ConnectorAdapter):
    connector_id = "splunk_es"
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
                logger.warning("splunk_es: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            events = [data]
        elif isinstance(data, list):
            events = data
        else:
            logger.warning("splunk_es: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [
            _normalise_notable(e, workspace_id) for e in events if isinstance(e, dict)
        ]
        return NormalisedBatch(hypotheses=hypotheses)
