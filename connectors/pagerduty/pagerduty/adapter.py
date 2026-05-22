from __future__ import annotations

import json
import logging
import os
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch

logger = logging.getLogger(__name__)


def send_pagerduty_event(routing_key: str, payload: dict[str, Any]) -> None:
    if os.environ.get("THMP_CONNECTOR_LIVE_HTTP") != "1":
        logger.info("PagerDuty event skipped")
        return
    import httpx

    url = "https://events.pagerduty.com/v2/enqueue"
    body = {"routing_key": routing_key, "event_action": "trigger", "payload": payload}
    httpx.post(url, json=body, timeout=15)


class PagerDutyAdapter(ConnectorAdapter):
    connector_id = "pagerduty"
    version = "0.1.0"

    def health_check(self, integration_config: dict[str, Any]) -> bool:
        return bool(integration_config.get("routing_key"))

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
                return NormalisedBatch()
        else:
            data = raw_payload
        if not isinstance(data, dict):
            return NormalisedBatch()
        sev = str(data.get("severity") or "").lower()
        if sev not in {"critical", "high"}:
            return NormalisedBatch()
        rk = str(integration_config.get("routing_key") or "")
        svc = str(integration_config.get("service_name") or "THMP")
        if rk:
            send_pagerduty_event(
                rk,
                {
                    "summary": str(data.get("summary") or "THMP escalation"),
                    "severity": "critical" if sev == "critical" else "error",
                    "source": svc,
                    "custom_details": data,
                },
            )
        return NormalisedBatch()
