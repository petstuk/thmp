from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


SUPPORTED_STIX_TYPES = frozenset(
    {
        "indicator",
        "attack-pattern",
        "threat-actor",
        "campaign",
        "malware",
    }
)


class StixObject(BaseModel):
    id: str
    type: str
    name: str = ""
    description: str = ""
    confidence: int = 50
    external_references: list[dict[str, Any]] = Field(default_factory=list)
    labels: list[str] = Field(default_factory=list)


class StixBundle(BaseModel):
    type: str = "bundle"
    id: str = ""
    objects: list[dict[str, Any]] = Field(default_factory=list)
