from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis
from misp.schemas import IOC_ATTRIBUTE_TYPES

logger = logging.getLogger(__name__)

# MISP threat_level_id → THMP severity
# 1=High, 2=Medium, 3=Low, 4=Undefined
_THREAT_LEVEL_MAP: dict[str, str] = {
    "1": "high",
    "2": "medium",
    "3": "low",
    "4": "informational",
}


def _map_severity(threat_level_id: str | int) -> str:
    return _THREAT_LEVEL_MAP.get(str(threat_level_id), "low")


def _extract_iocs(attributes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    iocs: list[dict[str, Any]] = []
    for attr in attributes:
        attr_type = str(attr.get("type") or "")
        if attr_type in IOC_ATTRIBUTE_TYPES:
            iocs.append(
                {
                    "type": attr_type,
                    "value": str(attr.get("value") or ""),
                    "uuid": str(attr.get("uuid") or ""),
                    "to_ids": bool(attr.get("to_ids")),
                }
            )
    return iocs


def _extract_attack_refs(tags: list[dict[str, Any]], galaxies: list[dict[str, Any]]) -> list[str]:
    """Pull ATT&CK technique IDs from MISP tags and galaxy clusters."""
    hints: list[str] = []

    for tag in tags:
        name = str(tag.get("name") or "")
        # MISP ATT&CK tags look like: misp-galaxy:mitre-attack-pattern="T1566 - Phishing"
        if "mitre-attack-pattern" in name or "mitre-attack" in name:
            # Try to extract TxxYY
            import re
            matches = re.findall(r"T\d{4}(?:\.\d{3})?", name)
            hints.extend(matches)

    for galaxy in galaxies:
        galaxy_type = str(galaxy.get("type") or "")
        if "mitre-attack-pattern" in galaxy_type:
            for cluster in galaxy.get("GalaxyCluster") or []:
                ext_id = str(cluster.get("value") or "")
                import re
                matches = re.findall(r"T\d{4}(?:\.\d{3})?", ext_id)
                hints.extend(matches)

    return list(dict.fromkeys(hints))  # dedupe, preserve order


def export_finding_to_misp(finding: dict[str, Any], misp_url: str, api_key: str) -> None:
    """Stub: log intent to export a THMP finding back to MISP.

    A real implementation would call:
      POST {misp_url}/events with the finding serialised as a MISP event.
    """
    logger.info(
        "export_finding_to_misp: would POST finding id=%s to %s (not implemented)",
        finding.get("id"),
        misp_url,
    )


class MispAdapter(ConnectorAdapter):
    connector_id = "misp"
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
                logger.warning("misp: could not decode payload bytes")
                return NormalisedBatch()
        else:
            data = raw_payload

        if not isinstance(data, dict):
            logger.warning("misp: expected a MISP event dict, got %s", type(data))
            return NormalisedBatch()

        # Support both bare event and wrapped {"Event": {...}}
        event = data.get("Event", data)

        event_uuid = str(event.get("uuid") or "")
        info = str(event.get("info") or "MISP Event")
        description = str(event.get("description") or "")
        threat_level_id = str(event.get("threat_level_id") or "3")
        attributes: list[dict[str, Any]] = event.get("Attribute") or []
        tags: list[dict[str, Any]] = event.get("Tag") or []
        galaxies: list[dict[str, Any]] = event.get("Galaxy") or []

        severity = _map_severity(threat_level_id)
        iocs = _extract_iocs(attributes)
        attack_hints = _extract_attack_refs(tags, galaxies)

        metadata: dict[str, Any] = {"ioc_count": len(iocs)}
        if attack_hints:
            metadata["attack_technique_hints"] = attack_hints

        hyp = NormalisedHypothesis(
            title=info[:256],
            description=description[:20000],
            severity=severity,  # type: ignore[arg-type]
            source_type="intel_feed",
            source_ref={"misp_event_uuid": event_uuid, "ioc_count": len(iocs)},
            metadata=metadata,
            dedupe_key=f"misp:{event_uuid}"[:512],
            workspace_id=workspace_id,
        )

        return NormalisedBatch(hypotheses=[hyp], iocs=iocs)
