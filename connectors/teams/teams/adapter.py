from __future__ import annotations

import json
import logging
import os
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch

logger = logging.getLogger(__name__)


def send_teams_card(webhook_url: str, card: dict[str, Any]) -> None:
    if os.environ.get("THMP_CONNECTOR_LIVE_HTTP") != "1":
        logger.info("Teams webhook skipped")
        return
    import httpx

    httpx.post(webhook_url, json=card, timeout=15)


class TeamsNotifyAdapter(ConnectorAdapter):
    connector_id = "microsoft_teams"
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
        if isinstance(raw_payload, bytes):
            try:
                data = json.loads(raw_payload.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                return NormalisedBatch()
        else:
            data = raw_payload
        if not isinstance(data, dict):
            return NormalisedBatch()
        url = str(integration_config.get("webhook_url") or "")
        title = str(data.get("title") or "THMP notification")
        body = str(data.get("message") or "")
        card = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": title,
            "themeColor": "0078D7",
            "sections": [{"activityTitle": title, "text": body}],
        }
        if url:
            send_teams_card(url, card)
        return NormalisedBatch()
