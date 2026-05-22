from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


ScmSeverity = Literal["critical", "high", "medium", "low", "info"]


class ScmFinding(BaseModel):
    finding_id: str
    title: str
    description: str = ""
    severity: ScmSeverity = "medium"
    repo: str = ""
    package: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
