from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis

logger = logging.getLogger(__name__)

_PRI_MAP = {"1": "critical", "2": "high", "3": "medium", "4": "low", "5": "informational"}


def update_incident_state(sys_id: str, state: str, servicenow_url: str, user: str, password: str) -> None:
    """Bidirectional write-back (enable with THMP_CONNECTOR_LIVE_HTTP=1)."""
    import os

    if os.environ.get("THMP_CONNECTOR_LIVE_HTTP") != "1":
        logger.info("ServiceNow update skipped for %s", sys_id)
        return
    import httpx

    url = f"{servicenow_url.rstrip('/')}/api/now/table/sn_si_incident/{sys_id}"
    httpx.patch(url, json={"state": state}, auth=(user, password), timeout=30)


class ServiceNowSirAdapter(ConnectorAdapter):
    connector_id = "servicenow_sir"
    version = "0.1.0"

    def health_check(self, integration_config: dict[str, Any]) -> bool:
        return bool(integration_config.get("servicenow_url"))

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
        rows = data if isinstance(data, list) else [data] if isinstance(data, dict) else []
        hypotheses: list[NormalisedHypothesis] = []
        for rec in rows:
            if not isinstance(rec, dict):
                continue
            sid = str(rec.get("sys_id") or rec.get("id") or "")
            if not sid:
                continue
            num = str(rec.get("number") or "")
            title = str(rec.get("short_description") or rec.get("title") or "ServiceNow SIR")
            desc = str(rec.get("description") or "")
            pri = str(rec.get("priority") or "3")
            sev = _PRI_MAP.get(pri, "medium")
            hypotheses.append(
                NormalisedHypothesis(
                    title=title[:256],
                    description=desc[:20000],
                    severity=sev,  # type: ignore[arg-type]
                    source_type="integration",
                    source_ref={"servicenow_sys_id": sid, "number": num},
                    metadata={"vendor": "servicenow_sir", "ingest_confidence": 0.5},
                    dedupe_key=f"servicenow:{sid}"[:512],
                    workspace_id=workspace_id,
                )
            )
        return NormalisedBatch(hypotheses=hypotheses)
