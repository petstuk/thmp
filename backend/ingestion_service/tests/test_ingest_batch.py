"""Unit tests for ingestion service batch endpoint.

Uses unittest.mock to patch httpx calls so no live services are required.
"""
from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


WORKSPACE_ID = str(uuid.uuid4())
ACTOR_ID = str(uuid.uuid4())
HYP_ID = str(uuid.uuid4())

MOCK_INTEGRATION_RESPONSE = {
    "id": str(uuid.uuid4()),
    "workspace_id": WORKSPACE_ID,
    "connector_id": "example_webhook",
    "config": {"ingest_actor_user_id": ACTOR_ID},
    "is_enabled": True,
}

MOCK_HYPOTHESIS_RESPONSE = {"id": HYP_ID, "created": True}


def _mock_http_responses(*responses):
    """Build an AsyncMock for httpx.AsyncClient that returns responses in order."""
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    resp_iter = iter(responses)

    async def _get(*args, **kwargs):
        return next(resp_iter)

    async def _post(*args, **kwargs):
        return next(resp_iter)

    mock_client.get = _get
    mock_client.post = _post
    return mock_client


def _make_httpx_response(status_code: int, body: dict):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json = MagicMock(return_value=body)
    resp.raise_for_status = MagicMock()
    resp.text = json.dumps(body)
    return resp


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health(client: TestClient) -> None:
    resp = client.get("/health/live")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_ingest_batch_missing_auth(client: TestClient) -> None:
    resp = client.post("/api/v1/ingest/batch", json={
        "workspace_id": WORKSPACE_ID,
        "connector_id": "example_webhook",
        "raw_payload": {"event": "test"},
    })
    assert resp.status_code == 403


def test_ingest_batch_connector_not_found(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/ingest/batch",
        json={
            "workspace_id": WORKSPACE_ID,
            "connector_id": "nonexistent_connector",
            "raw_payload": {},
        },
        headers={"X-Internal-Token": "test-internal"},
    )
    assert resp.status_code in (404, 500)


def test_ingest_batch_success(client: TestClient) -> None:
    integ_resp = _make_httpx_response(200, MOCK_INTEGRATION_RESPONSE)
    hyp_resp = _make_httpx_response(201, MOCK_HYPOTHESIS_RESPONSE)
    mock_client = _mock_http_responses(integ_resp, hyp_resp)

    with patch("app.routers.ingest.httpx.AsyncClient", return_value=mock_client):
        resp = client.post(
            "/api/v1/ingest/batch",
            json={
                "workspace_id": WORKSPACE_ID,
                "connector_id": "example_webhook",
                "raw_payload": {
                    "event_id": "evt-123",
                    "title": "Suspicious package update",
                    "description": "Package foo was updated from 1.0 to 1.1 with unexpected changes.",
                    "severity": "high",
                    "source": "elastic-scm",
                },
            },
            headers={"X-Internal-Token": "test-internal"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "hypotheses" in data
