from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis


class ExampleWebhookAdapter(ConnectorAdapter):
    connector_id = "example_webhook"
    version = "0.1.0"

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

        title = data.get("title")
        body = data.get("body") or data.get("description") or ""
        ext_id = data.get("external_id") or data.get("id")
        if not title or not ext_id:
            return NormalisedBatch()

        prefix = str(integration_config.get("title_prefix") or "").strip()
        full_title = f"{prefix} {title}".strip() if prefix else str(title)

        dedupe_key = f"{self.connector_id}:{ext_id}"
        return NormalisedBatch(
            hypotheses=[
                NormalisedHypothesis(
                    title=full_title[:256],
                    description=str(body)[:20000] if body else "",
                    severity="medium",
                    source_type="integration",
                    source_ref={"vendor": {"id": str(ext_id)}},
                    metadata={"example_webhook": True},
                    dedupe_key=dedupe_key[:512],
                    workspace_id=workspace_id,
                )
            ]
        )


def load_adapter() -> ConnectorAdapter:
    return ExampleWebhookAdapter()
