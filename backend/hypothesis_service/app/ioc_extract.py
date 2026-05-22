from __future__ import annotations

import re
from typing import Any

_IPV4 = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"
)
# Simplified domain (not full RFC)
_DOMAIN = re.compile(
    r"\b(?=.{4,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}\b"
)
_SHA256 = re.compile(r"\b[a-fA-F0-9]{64}\b")
_MD5 = re.compile(r"\b[a-fA-F0-9]{32}\b")
_URL = re.compile(r"\bhttps?://[^\s<>\"']+[^\s.,;<>\"')\]]")


def extract_iocs_from_text(text: str) -> list[dict[str, Any]]:
    if not text or not text.strip():
        return []
    seen: set[tuple[str, str]] = set()
    out: list[dict[str, Any]] = []

    def add(ioc_type: str, value: str) -> None:
        key = (ioc_type, value.lower())
        if key in seen:
            return
        seen.add(key)
        out.append({"type": ioc_type, "value": value})

    for m in _IPV4.finditer(text):
        add("ip", m.group(0))
    for m in _DOMAIN.finditer(text):
        val = m.group(0)
        if not _IPV4.fullmatch(val):
            add("domain", val)
    for m in _SHA256.finditer(text):
        add("hash", m.group(0).lower())
    for m in _MD5.finditer(text):
        h = m.group(0).lower()
        if not any(x["value"] == h for x in out if x["type"] == "hash"):
            add("hash", h)
    for m in _URL.finditer(text):
        add("url", m.group(0)[:2048])
    return out
