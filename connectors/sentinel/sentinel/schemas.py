from __future__ import annotations

# Sentinel incident severity → THMP severity
SENTINEL_SEVERITY_MAP: dict[str, str] = {
    "High": "high",
    "Medium": "medium",
    "Low": "low",
    "Informational": "informational",
}
