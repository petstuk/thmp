from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class InternalAuditEvent(BaseModel):
    action: str
    entity_type: str
    entity_id: UUID
    actor_user_id: UUID | None = None
    actor_ip: str | None = None
    workspace_id: UUID | None = None
    diff: dict[str, Any] = Field(default_factory=dict)
    request_id: str | None = None


class AuditEventOut(BaseModel):
    id: UUID
    occurred_at: datetime
    actor_user_id: UUID | None
    action: str
    entity_type: str
    entity_id: UUID
    workspace_id: UUID | None
    diff: dict[str, Any]
    request_id: str | None

    model_config = {"from_attributes": True}
