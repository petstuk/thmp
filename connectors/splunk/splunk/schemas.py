from __future__ import annotations

from typing import Literal

SplunkUrgency = Literal["critical", "high", "medium", "low", "informational"]

URGENCY_MAP: dict[str, str] = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
    "informational": "informational",
}
