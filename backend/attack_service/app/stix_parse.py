"""Pure STIX 2.1 parsing for MITRE ATT&CK Enterprise (no DB imports)."""

from __future__ import annotations

from typing import Any

DEFAULT_BUNDLE_URL = (
    "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"
)


def _objects_from_bundle(data: dict[str, Any]) -> list[dict[str, Any]]:
    if data.get("type") == "bundle" and "objects" in data:
        return list(data["objects"])
    if isinstance(data.get("objects"), list):
        return list(data["objects"])
    return []


def extract_bundle_attack_version(data: dict[str, Any]) -> str | None:
    """Best-effort MITRE ATT&CK version from STIX collection object (x_mitre_version)."""
    for o in _objects_from_bundle(data):
        if o.get("type") != "x-mitre-collection":
            continue
        v = o.get("x_mitre_version")
        if v is None:
            continue
        s = str(v).strip()
        if s:
            return s[:32]
    return None


def _mitre_technique_id(obj: dict[str, Any]) -> str | None:
    for ref in obj.get("external_references") or []:
        if ref.get("source_name") == "mitre-attack":
            eid = str(ref.get("external_id", ""))
            if eid.startswith("T"):
                return eid
    return None


def _active(obj: dict[str, Any]) -> bool:
    return not obj.get("revoked") and not obj.get("x_mitre_deprecated")


def parse_enterprise_bundle(objects: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, str]]:
    """Return tactic_rows, technique_rows, parent_stix_by_sub_stix_id."""
    parent_stix_by_sub: dict[str, str] = {}
    for o in objects:
        if o.get("type") != "relationship":
            continue
        if o.get("relationship_type") != "subtechnique-of":
            continue
        if o.get("revoked"):
            continue
        src = o.get("source_ref")
        tgt = o.get("target_ref")
        if isinstance(src, str) and isinstance(tgt, str):
            parent_stix_by_sub[src] = tgt

    tactic_rows: list[dict[str, Any]] = []
    for o in objects:
        if o.get("type") != "x-mitre-tactic":
            continue
        if not _active(o):
            continue
        stix_id = o.get("id")
        if not isinstance(stix_id, str):
            continue
        name = str(o.get("name", ""))
        short_name = str(o.get("x_mitre_shortname", ""))
        desc = str(o.get("description", "") or "")
        tactic_rows.append({"stix_id": stix_id, "name": name, "short_name": short_name, "description": desc})

    technique_rows: list[dict[str, Any]] = []
    for o in objects:
        if o.get("type") != "attack-pattern":
            continue
        if not _active(o):
            continue
        stix_id = o.get("id")
        if not isinstance(stix_id, str):
            continue
        mitre_id = _mitre_technique_id(o)
        if not mitre_id:
            continue
        name = str(o.get("name", ""))
        desc = str(o.get("description", "") or "")
        is_sub = bool(o.get("x_mitre_is_subtechnique"))
        platforms = o.get("x_mitre_platforms")
        plat_list: list[str] | None
        if isinstance(platforms, list):
            plat_list = [str(p) for p in platforms]
        else:
            plat_list = None

        parent_stix: str | None = parent_stix_by_sub.get(stix_id)

        tactic_shorts: list[str] = []
        for phase in o.get("kill_chain_phases") or []:
            if not isinstance(phase, dict):
                continue
            if phase.get("kill_chain_name") != "mitre-attack":
                continue
            pn = phase.get("phase_name")
            if isinstance(pn, str):
                tactic_shorts.append(pn)

        technique_rows.append(
            {
                "stix_id": stix_id,
                "mitre_id": mitre_id,
                "name": name,
                "description": desc,
                "is_subtechnique": is_sub,
                "platforms": plat_list,
                "parent_stix_id": parent_stix,
                "tactic_short_names": tactic_shorts,
            }
        )

    return tactic_rows, technique_rows, parent_stix_by_sub
