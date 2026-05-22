from __future__ import annotations

import json
import logging
import os
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch

logger = logging.getLogger(__name__)


def send_slack_message(webhook_url: str, text: str) -> None:
    if os.environ.get("THMP_CONNECTOR_LIVE_HTTP") != "1":
        logger.info("Slack send skipped: %s", text[:120])
        return
    import httpx

    httpx.post(webhook_url, json={"text": text}, timeout=15)


class SlackNotifyAdapter(ConnectorAdapter):
    connector_id = "slack"
    version = "0.1.0"

    def health_check(self, integration_config: dict[str, Any]) -> bool:
        return bool(integration_config.get("webhook_url"))

    def normalise(
        self,
        raw_payload: bytes | dict[str, Any],
        *,
        workspace_id: UUID,
        integration_config: dict[str, Any],
    ) -> NormalisedBatch:
        """Outbound notification adapter: platform passes event dicts; no hypotheses created."""
        if isinstance(raw_payload, bytes):
            try:
                data = json.loads(raw_payload.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                return NormalisedBatch()
        else:
            data = raw_payload
        if not isinstance(data, dict):
            return NormalisedBatch()
        raw_triggers = integration_config.get("trigger_on") or [
            "hypothesis.validated",
            "hunt.closed",
        ]
        if isinstance(raw_triggers, str):
            triggers = [t.strip() for t in raw_triggers.split(",") if t.strip()]
        else:
            triggers = list(raw_triggers) if isinstance(raw_triggers, list) else []
        if not triggers:
            triggers = ["hypothesis.validated", "hunt.closed"]
        ev = str(data.get("event_type") or "")
        if ev and ev not in triggers:
            return NormalisedBatch()
        url = str(integration_config.get("webhook_url") or "")
        if url and data.get("message"):
            send_slack_message(url, str(data["message"]))
        return NormalisedBatch()
