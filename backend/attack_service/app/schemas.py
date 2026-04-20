from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TacticOut(BaseModel):
    id: UUID
    stix_id: str
    name: str
    short_name: str
    description: str
    created_at: datetime
    updated_at: datetime


class TechniqueSummary(BaseModel):
    id: UUID
    stix_id: str
    mitre_id: str
    name: str
    is_subtechnique: bool
    parent_technique_id: UUID | None = None


class TechniqueOut(BaseModel):
    id: UUID
    stix_id: str
    mitre_id: str
    name: str
    description: str
    is_subtechnique: bool
    parent_technique_id: UUID | None = None
    platforms: list[str] | None = None
    updated_at: datetime
    tactic_short_names: list[str] = Field(default_factory=list)


class ValidateTechniqueIdsRequest(BaseModel):
    ids: list[UUID] = Field(default_factory=list, max_length=500)


class ValidateTechniqueIdsResponse(BaseModel):
    missing: list[UUID]


class SyncOut(BaseModel):
    tactics: int
    techniques: int


class AttackCatalogStatusOut(BaseModel):
    last_sync_at: datetime | None = None
    source_url_display: str | None = None
    bundle_attack_version: str | None = None
    tactic_count: int
    technique_count: int
    catalog_ready: bool
