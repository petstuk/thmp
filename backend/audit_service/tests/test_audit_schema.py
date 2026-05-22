"""Unit tests for audit service schema validation (no DB required)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.schemas import AuditEventOut, InternalAuditEvent


def test_internal_audit_event_minimal() -> None:
    actor = uuid.uuid4()
    entity = uuid.uuid4()
    workspace = uuid.uuid4()
    event = InternalAuditEvent(
        actor_user_id=actor,
        action="hypothesis.create",
        entity_type="hypothesis",
        entity_id=entity,
        workspace_id=workspace,
        diff={"title": "test"},
    )
    assert event.action == "hypothesis.create"
    assert event.entity_type == "hypothesis"


def test_internal_audit_event_optional_workspace() -> None:
    event = InternalAuditEvent(
        actor_user_id=uuid.uuid4(),
        action="user.register",
        entity_type="user",
        entity_id=uuid.uuid4(),
        workspace_id=None,
        diff={"email": "a@b.com"},
    )
    assert event.workspace_id is None


def test_audit_event_out_serialises() -> None:
    now = datetime.now(tz=timezone.utc)
    ev = AuditEventOut(
        id=uuid.uuid4(),
        actor_user_id=uuid.uuid4(),
        action="evidence.upload",
        entity_type="evidence",
        entity_id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        diff={"hypothesis_id": str(uuid.uuid4())},
        request_id=None,
        occurred_at=now,
    )
    dumped = ev.model_dump()
    assert dumped["action"] == "evidence.upload"
    assert "occurred_at" in dumped
