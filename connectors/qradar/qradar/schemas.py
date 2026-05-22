from __future__ import annotations


def qradar_severity_to_thmp(severity: int | float) -> str:
    """Map QRadar offence severity (0–10) to THMP severity.

    0–3  → low
    4–6  → medium
    7–8  → high
    9–10 → critical
    """
    s = float(severity)
    if s >= 9:
        return "critical"
    if s >= 7:
        return "high"
    if s >= 4:
        return "medium"
    return "low"
