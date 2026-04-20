from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.deps import get_db, require_internal_token
from app.main import app
from app.models import Hypothesis
from app.routers import internal_hypotheses


class _ExecResult:
    def __init__(self, scalar: uuid.UUID | None) -> None:
        self._scalar = scalar

    def scalar_one_or_none(self) -> uuid.UUID | None:
        return self._scalar


class _FakeSession:
    def __init__(self, first_lookup: uuid.UUID | None) -> None:
        self._first = first_lookup
        self._executes = 0
        self.added: list[object] = []

    async def execute(self, _stmt: object) -> _ExecResult:
        self._executes += 1
        if self._executes == 1:
            return _ExecResult(self._first)
        return _ExecResult(None)

    def add(self, obj: object) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        return None

    async def refresh(self, obj: object) -> None:
        if isinstance(obj, Hypothesis) and obj.id is None:
            object.__setattr__(obj, "id", uuid.uuid4())


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[require_internal_token] = lambda: None
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _payload(ws: uuid.UUID, actor: uuid.UUID, dedupe: str) -> dict:
    return {
        "workspace_id": str(ws),
        "created_by": str(actor),
        "title": "Ingest test",
        "description": "",
        "severity": "medium",
        "source_type": "integration",
        "source_ref": {"vendor": {"id": "1"}},
        "metadata": None,
        "dedupe_key": dedupe,
        "connector_id": "example_webhook",
    }


def test_ingest_dedupe_returns_existing(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(internal_hypotheses, "emit_audit", AsyncMock())
    existing_id = uuid.uuid4()
    ws, actor = uuid.uuid4(), uuid.uuid4()
    fake = _FakeSession(first_lookup=existing_id)

    async def _db() -> AsyncGenerator[_FakeSession, None]:
        yield fake

    app.dependency_overrides[get_db] = _db
    try:
        r = client.post(
            "/api/v1/internal/hypotheses/ingest-item",
            json=_payload(ws, actor, "same-key"),
        )
    finally:
        del app.dependency_overrides[get_db]

    assert r.status_code == 200
    body = r.json()
    assert body["id"] == str(existing_id)
    assert body["created"] is False
    assert fake.added == []


def test_ingest_creates_when_no_duplicate(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(internal_hypotheses, "emit_audit", AsyncMock())
    ws, actor = uuid.uuid4(), uuid.uuid4()
    fake = _FakeSession(first_lookup=None)

    async def _db() -> AsyncGenerator[_FakeSession, None]:
        yield fake

    app.dependency_overrides[get_db] = _db
    try:
        r = client.post(
            "/api/v1/internal/hypotheses/ingest-item",
            json=_payload(ws, actor, "new-key"),
        )
    finally:
        del app.dependency_overrides[get_db]

    assert r.status_code == 200
    body = r.json()
    assert body["created"] is True
    assert len(fake.added) == 1
    hyp = fake.added[0]
    assert getattr(hyp, "title") == "Ingest test"
