"""Testing helpers for connector development.

Exports:
  MockBatchApplier          — in-memory batch collector
  MockPlatformServer        — local FastAPI server simulating ingest endpoints
  load_connector_by_id      — load a connector from pkg_resources entry points
  connector_normalise_fixture — pytest helper that feeds canned payloads
"""
from __future__ import annotations

import importlib.metadata
import uuid
from typing import Any
from uuid import UUID

from thmp_cdk.types import NormalisedBatch, NormalisedHypothesis


class MockBatchApplier:
    """In-memory collector for unit tests (simulates platform apply)."""

    def __init__(self) -> None:
        self.applied_hypotheses: list[NormalisedHypothesis] = []
        self.batches: list[NormalisedBatch] = []

    def apply(self, batch: NormalisedBatch) -> None:
        self.batches.append(batch)
        self.applied_hypotheses.extend(batch.hypotheses)


def load_connector_by_id(connector_id: str) -> Any:
    """Load a ConnectorAdapter subclass by its entry-point connector_id.

    Entry points must be registered under 'thmp.connectors' in pyproject.toml:

        [project.entry-points."thmp.connectors"]
        my_connector = "my_package.adapter:MyAdapter"

    Returns an instantiated adapter.
    Raises KeyError if connector_id is not registered.
    """
    eps = importlib.metadata.entry_points(group="thmp.connectors")
    for ep in eps:
        if ep.name != connector_id:
            continue
        loaded: Any = ep.load()
        if isinstance(loaded, type):
            return loaded()
        if callable(loaded):
            return loaded()
        raise TypeError(f"Entry point {connector_id!r} must be a class or factory")
    raise KeyError(f"No connector entry point named {connector_id!r} under 'thmp.connectors'")


def make_mock_platform_server(
    workspace_id: UUID | None = None,
    integration_config: dict[str, Any] | None = None,
) -> Any:
    """Return a FastAPI app that mocks the platform's internal ingest + config endpoints.

    Usage in pytest:

        from httpx import AsyncClient, ASGITransport
        from thmp_cdk.testing import make_mock_platform_server

        app = make_mock_platform_server(workspace_id=uuid.uuid4())
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(f"/api/v1/internal/integrations/workspace/{workspace_id}")
    """
    try:
        from fastapi import FastAPI, Request
    except ImportError as exc:
        raise ImportError("fastapi is required for MockPlatformServer. Add it to your test deps.") from exc

    _ws_id = workspace_id or uuid.uuid4()
    _cfg = integration_config or {"ingest_actor_user_id": str(uuid.uuid4())}
    _created: list[dict[str, Any]] = []

    mock_app = FastAPI(title="MockPlatformServer")

    @mock_app.get("/api/v1/internal/integrations/workspace/{ws}")
    def get_integration(ws: str) -> dict:
        return {
            "id": str(uuid.uuid4()),
            "workspace_id": str(_ws_id),
            "connector_id": "test",
            "config": _cfg,
            "is_enabled": True,
        }

    @mock_app.post("/api/v1/internal/hypotheses/ingest-item")
    async def ingest_item(request: Request) -> dict:
        body = await request.json()
        eid = str(uuid.uuid4())
        _created.append({**body, "id": eid})
        return {"id": eid, "created": True}

    @mock_app.get("/api/v1/mock/created")
    def list_created() -> list:
        return _created

    return mock_app
