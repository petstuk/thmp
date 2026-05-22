from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis
from qradar.schemas import qradar_severity_to_thmp

logger = logging.getLogger(__name__)


def _normalise_offence(offence: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis:
    offence_id = str(offence.get("id") or "")
    description = str(offence.get("description") or "QRadar Offence")
    rules: list[str] = [str(r) for r in (offence.get("rules") or []) if r]
    raw_severity = offence.get("severity") or 0

    try:
        severity_int = float(raw_severity)
    except (TypeError, ValueError):
        severity_int = 0.0

    severity = qradar_severity_to_thmp(severity_int)
    title = description.split("\n")[0][:256] or f"QRadar Offence {offence_id}"

    return NormalisedHypothesis(
        title=title[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="siem",
        source_ref={
            "offence_id": offence_id,
            "rules": rules,
        },
        metadata={"raw_severity": severity_int},
        dedupe_key=f"qradar:{offence_id}"[:512],
        workspace_id=workspace_id,
    )


def update_offence_status(
    offence_id: str | int,
    status: str,
    qradar_url: str,
    api_key: str,
) -> None:
    """Stub: log intent to update QRadar offence status.

    A real implementation would POST to:
      {qradar_url}/api/siem/offenses/{offence_id}
    with body {"status": status}.
    """
    logger.info(
        "update_offence_status: would update offence id=%s to status=%s at %s (not implemented)",
        offence_id,
        status,
        qradar_url,
    )


class QRadarAdapter(ConnectorAdapter):
    connector_id = "ibm_qradar"
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
                logger.warning("ibm_qradar: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            offences = [data]
        elif isinstance(data, list):
            offences = data
        else:
            logger.warning("ibm_qradar: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses = [
            _normalise_offence(o, workspace_id) for o in offences if isinstance(o, dict)
        ]
        return NormalisedBatch(hypotheses=hypotheses)
