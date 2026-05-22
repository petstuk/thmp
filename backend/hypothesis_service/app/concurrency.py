from __future__ import annotations

from datetime import datetime, timezone


def normalize_if_match(header: str | None) -> str | None:
    if header is None:
        return None
    raw = header.strip()
    if raw.startswith("W/"):
        raw = raw[2:].strip()
    if raw.startswith('"') and raw.endswith('"'):
        raw = raw[1:-1]
    return raw


def updated_at_matches_row(updated_at: datetime, if_match: str | None) -> bool:
    if if_match is None:
        return True
    cand = updated_at
    if cand.tzinfo is None:
        cand = cand.replace(tzinfo=timezone.utc)
    iso = cand.isoformat()
    if if_match == iso:
        return True
    iso_z = iso.replace("+00:00", "Z")
    if if_match == iso_z:
        return True
    return False
