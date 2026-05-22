from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis
from elastic_siem.schemas import ELASTIC_SEVERITY_MAP

logger = logging.getLogger(__name__)


def _get_nested(data: dict[str, Any], dotted_key: str, default: Any = None) -> Any:
    """Retrieve a value from a dict using a dot-separated key path."""
    parts = dotted_key.split(".")
    current: Any = data
    for part in parts:
        if not isinstance(current, dict):
            return default
        current = current.get(part, default)
    return current


def _map_severity(elastic_severity: str) -> str:
    return ELASTIC_SEVERITY_MAP.get(str(elastic_severity).lower(), "medium")


def _normalise_alert(alert: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    alert_id = str(alert.get("_id") or "")
    rule_name = str(
        _get_nested(alert, "kibana.alert.rule.name")
        or _get_nested(alert, "_source.kibana.alert.rule.name")
        or "Elastic Security Alert"
    )
    reason = str(
        _get_nested(alert, "kibana.alert.reason")
        or _get_nested(alert, "_source.kibana.alert.reason")
        or ""
    )
    elastic_severity = str(
        _get_nested(alert, "kibana.alert.severity")
        or _get_nested(alert, "_source.kibana.alert.severity")
        or "medium"
    )
    timeline_id = str(
        _get_nested(alert, "kibana.alert.rule.timeline_id")
        or _get_nested(alert, "_source.kibana.alert.rule.timeline_id")
        or ""
    )

    severity = _map_severity(elastic_severity)

    return NormalisedHypothesis(
        title=rule_name[:256],
        description=reason[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="siem",
        source_ref={
            "alert_id": alert_id,
            "timeline_id": timeline_id,
        },
        metadata={"elastic_severity": elastic_severity},
        dedupe_key=f"elastic_siem:{alert_id}"[:512],
        workspace_id=workspace_id,
    )


class ElasticSiemAdapter(ConnectorAdapter):
    connector_id = "elastic_siem"
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
                logger.warning("elastic_siem: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            alerts = [data]
        elif isinstance(data, list):
            alerts = data
        else:
            logger.warning("elastic_siem: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [
            _normalise_alert(a, workspace_id) for a in alerts if isinstance(a, dict)
        ]
        return NormalisedBatch(hypotheses=hypotheses)
