from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

IOC_ATTRIBUTE_TYPES = frozenset(
    {
        "ip-src",
        "ip-dst",
        "domain",
        "url",
        "md5",
        "sha256",
        "email-src",
    }
)


class MispAttribute(BaseModel):
    uuid: str = ""
    type: str = ""
    value: str = ""
    category: str = ""
    to_ids: bool = False


class MispEvent(BaseModel):
    uuid: str
    info: str = ""
    description: str = ""
    threat_level_id: str = "3"
    Attribute: list[dict[str, Any]] = Field(default_factory=list)
    Tag: list[dict[str, Any]] = Field(default_factory=list)
    Galaxy: list[dict[str, Any]] = Field(default_factory=list)
