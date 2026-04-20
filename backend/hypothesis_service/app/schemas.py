from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

HypothesisStatus = Literal["draft", "active", "in_hunt", "validated", "closed", "archived"]
Severity = Literal["informational", "low", "medium", "high", "critical"]
SourceType = Literal["manual", "intel_feed", "scm", "siem", "vuln_scanner", "integration"]


class HypothesisCreate(BaseModel):
    title: str = Field(max_length=256)
    description: str = ""
    severity: Severity = "medium"
    source_type: SourceType = "manual"
    source_ref: dict[str, Any] | None = None
    attack_technique_ids: list[UUID] | None = None
    tags: list[str] | None = None
    due_date: datetime | None = None
    metadata: dict[str, Any] | None = None
    owner_id: UUID | None = None


class InternalHypothesisIngestItem(BaseModel):
    workspace_id: UUID
    created_by: UUID
    title: str = Field(max_length=256)
    description: str = ""
    severity: Severity = "medium"
    source_type: SourceType
    source_ref: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None
    dedupe_key: str = Field(max_length=512)
    connector_id: str = Field(max_length=64)


class InternalIngestItemResult(BaseModel):
    id: UUID
    created: bool


class HypothesisPatch(BaseModel):
    title: str | None = Field(default=None, max_length=256)
    description: str | None = None
    severity: Severity | None = None
    owner_id: UUID | None = None
    source_ref: dict[str, Any] | None = None
    attack_technique_ids: list[UUID] | None = None
    tags: list[str] | None = None
    due_date: datetime | None = None
    metadata: dict[str, Any] | None = None
    confidence_score: float | None = Field(default=None, ge=0.0, le=1.0)
    status: HypothesisStatus | None = None
    transition_comment: str | None = None


class HypothesisOut(BaseModel):
    id: UUID
    title: str
    description: str
    status: str
    confidence_score: float
    severity: str
    owner_id: UUID
    workspace_id: UUID
    source_type: str
    source_ref: dict[str, Any] | None
    attack_technique_ids: list[UUID] | None
    tags: list[str] | None
    due_date: datetime | None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None
    metadata: dict[str, Any] | None = None

    model_config = {"from_attributes": False}


class EvidenceCreate(BaseModel):
    hypothesis_id: UUID
    type: Literal["file", "ioc", "log_snippet", "siem_query", "screenshot", "network_capture", "note"]
    title: str
    content: str | None = None
    storage_key: str | None = None
    mime_type: str | None = None
    iocs: list[dict[str, Any]] | None = None
    supports_hypothesis: bool = True
    weight: float = Field(default=0.5, ge=0.0, le=1.0)


class EvidenceOut(BaseModel):
    id: UUID
    hypothesis_id: UUID
    type: str
    title: str
    content: str | None
    storage_key: str | None
    mime_type: str | None
    iocs: list[Any] | None
    supports_hypothesis: bool
    weight: float
    version: int
    submitted_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class HuntCreate(BaseModel):
    name: str
    description: str = ""
    lead_id: UUID
    assigned_analyst_ids: list[UUID] | None = None
    hypothesis_ids: list[UUID] | None = None
    start_date: datetime
    end_date: datetime | None = None


class HuntOut(BaseModel):
    id: UUID
    name: str
    description: str
    status: str
    lead_id: UUID
    assigned_analyst_ids: list[UUID] | None
    hypothesis_ids: list[UUID] | None
    start_date: datetime
    end_date: datetime | None
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FindingCreate(BaseModel):
    hunt_id: UUID
    hypothesis_ids: list[UUID] | None = None
    title: str
    narrative: str
    outcome: Literal["confirmed", "refuted", "inconclusive", "mixed"]
    recommended_actions: str | None = None


class FindingOut(BaseModel):
    id: UUID
    hunt_id: UUID
    hypothesis_ids: list[UUID] | None
    title: str
    narrative: str
    outcome: str
    recommended_actions: str | None
    workspace_id: UUID
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


def hypothesis_to_out(h: Any) -> HypothesisOut:
    return HypothesisOut(
        id=h.id,
        title=h.title,
        description=h.description,
        status=h.status,
        confidence_score=h.confidence_score,
        severity=h.severity,
        owner_id=h.owner_id,
        workspace_id=h.workspace_id,
        source_type=h.source_type,
        source_ref=h.source_ref,
        attack_technique_ids=list(h.attack_technique_ids) if h.attack_technique_ids is not None else None,
        tags=list(h.tags) if h.tags is not None else None,
        due_date=h.due_date,
        created_by=h.created_by,
        created_at=h.created_at,
        updated_at=h.updated_at,
        closed_at=h.closed_at,
        metadata=h.metadata_json,
    )
