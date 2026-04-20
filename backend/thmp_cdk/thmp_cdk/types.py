from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

Severity = Literal["informational", "low", "medium", "high", "critical"]


class NormalisedHypothesis(BaseModel):
    """One hypothesis to be created by the platform (draft)."""

    title: str = Field(max_length=256)
    description: str = ""
    severity: Severity = "medium"
    source_type: str = Field(max_length=32)
    source_ref: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None
    dedupe_key: str = Field(max_length=512, description="Stable idempotency key for ingest dedupe")
    workspace_id: UUID | None = Field(
        default=None,
        description="Optional; platform may inject from request context",
    )


class NormalisedBatch(BaseModel):
    """Normalised output of one connector invocation (webhook or poll batch)."""

    hypotheses: list[NormalisedHypothesis] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    iocs: list[dict[str, Any]] = Field(default_factory=list)

    def hypotheses_as_dicts(self) -> list[dict[str, Any]]:
        return [h.model_dump(mode="json") for h in self.hypotheses]
