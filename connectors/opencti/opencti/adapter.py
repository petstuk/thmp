from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis
from opencti.schemas import KILL_CHAIN_TACTIC_MAP, SUPPORTED_ENTITY_TYPES

logger = logging.getLogger(__name__)


def _confidence_to_severity(confidence: int | float) -> str:
    if confidence > 75:
        return "high"
    if confidence > 50:
        return "medium"
    return "low"


def _extract_tactic_hints(kill_chain_phases: list[dict[str, Any]]) -> list[str]:
    """Convert OpenCTI kill_chain_phases to ATT&CK tactic hints."""
    hints: list[str] = []
    for phase in kill_chain_phases:
        phase_name = str(phase.get("phase_name") or "").lower()
        tactic = KILL_CHAIN_TACTIC_MAP.get(phase_name)
        if tactic:
            hints.append(tactic)
    return hints


def _entity_type_to_source_ref_type(entity_type: str) -> str:
    mapping = {
        "Report": "report",
        "Indicator": "indicator",
        "Threat-Actor": "threat_actor",
        "Malware": "malware",
        "Attack-Pattern": "attack_pattern",
    }
    return mapping.get(entity_type, entity_type.lower())


def _normalise_entity(entity: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis | None:
    entity_type = str(entity.get("entity_type") or entity.get("type") or "")
    if entity_type not in SUPPORTED_ENTITY_TYPES:
        return None

    entity_id = str(entity.get("id") or "")
    name = str(entity.get("name") or "")
    description = str(entity.get("description") or "")
    confidence = float(entity.get("confidence") or 0)
    kill_chain_phases: list[dict[str, Any]] = entity.get("kill_chain_phases") or []

    title = f"[{entity_type}] {name}" if name else f"[{entity_type}] {entity_id}"
    severity = _confidence_to_severity(confidence)
    tactic_hints = _extract_tactic_hints(kill_chain_phases)

    metadata: dict[str, Any] = {"entity_type": entity_type}
    if tactic_hints:
        metadata["attack_tactic_hints"] = tactic_hints

    return NormalisedHypothesis(
        title=title[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="intel_feed",
        source_ref={
            "entity_id": entity_id,
            "entity_type": _entity_type_to_source_ref_type(entity_type),
        },
        metadata=metadata,
        dedupe_key=f"opencti:{entity_id}"[:512],
        workspace_id=workspace_id,
    )


class OpenCtiAdapter(ConnectorAdapter):
    connector_id = "opencti"
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
                logger.warning("opencti: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if isinstance(data, dict):
            entities = [data]
        elif isinstance(data, list):
            entities = data
        else:
            logger.warning("opencti: unexpected payload type %s", type(data))
            return NormalisedBatch()

        hypotheses: list[NormalisedHypothesis] = []
        for entity in entities:
            if not isinstance(entity, dict):
                continue
            hyp = _normalise_entity(entity, workspace_id)
            if hyp is not None:
                hypotheses.append(hyp)

        return NormalisedBatch(hypotheses=hypotheses)
