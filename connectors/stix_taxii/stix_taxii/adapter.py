from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis
from stix_taxii.schemas import SUPPORTED_STIX_TYPES

logger = logging.getLogger(__name__)

_STIX_TYPE_TITLES: dict[str, str] = {
    "indicator": "STIX Indicator",
    "attack-pattern": "STIX Attack Pattern",
    "threat-actor": "STIX Threat Actor",
    "campaign": "STIX Campaign",
    "malware": "STIX Malware",
}


def _confidence_to_severity(confidence: int) -> str:
    if confidence > 80:
        return "high"
    if confidence > 50:
        return "medium"
    return "low"


def _extract_attack_hints(external_refs: list[dict[str, Any]]) -> list[str]:
    return [
        ref.get("external_id", "")
        for ref in external_refs
        if ref.get("source_name") == "mitre-attack" and ref.get("external_id")
    ]


def _normalise_stix_object(obj: dict[str, Any], workspace_id: UUID) -> NormalisedHypothesis | None:
    stix_type = str(obj.get("type") or "")
    if stix_type not in SUPPORTED_STIX_TYPES:
        return None

    stix_id = str(obj.get("id") or "")
    name = str(obj.get("name") or "")
    description = str(obj.get("description") or "")
    confidence = int(obj.get("confidence") or 50)
    external_refs: list[dict[str, Any]] = obj.get("external_references") or []
    labels: list[str] = obj.get("labels") or []

    type_label = _STIX_TYPE_TITLES.get(stix_type, stix_type)
    title = f"[{type_label}] {name}" if name else f"[{type_label}] {stix_id}"
    severity = _confidence_to_severity(confidence)
    attack_hints = _extract_attack_hints(external_refs)

    metadata: dict[str, Any] = {"stix_type": stix_type, "labels": labels}
    if attack_hints:
        metadata["attack_technique_hints"] = attack_hints

    return NormalisedHypothesis(
        title=title[:256],
        description=description[:20000],
        severity=severity,  # type: ignore[arg-type]
        source_type="intel_feed",
        source_ref={"stix_id": stix_id, "stix_type": stix_type},
        metadata=metadata,
        dedupe_key=f"stix:{stix_id}"[:512],
        workspace_id=workspace_id,
    )


class StixTaxiiAdapter(ConnectorAdapter):
    connector_id = "stix_taxii"
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
                logger.warning("stix_taxii: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if not isinstance(data, dict):
            logger.warning("stix_taxii: expected a STIX bundle dict, got %s", type(data))
            return NormalisedBatch()

        stix_objects: list[dict[str, Any]] = data.get("objects") or []
        hypotheses: list[NormalisedHypothesis] = []
        for obj in stix_objects:
            hyp = _normalise_stix_object(obj, workspace_id)
            if hyp is not None:
                hypotheses.append(hyp)

        return NormalisedBatch(hypotheses=hypotheses)
