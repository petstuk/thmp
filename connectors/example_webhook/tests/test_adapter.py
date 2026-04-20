from __future__ import annotations

from uuid import uuid4

from example_webhook.adapter import ExampleWebhookAdapter


def test_normalise_minimal() -> None:
    ws = uuid4()
    adapter = ExampleWebhookAdapter()
    batch = adapter.normalise(
        {"title": "Alert", "body": "Details", "external_id": "e1"},
        workspace_id=ws,
        integration_config={},
    )
    assert len(batch.hypotheses) == 1
    h = batch.hypotheses[0]
    assert h.title == "Alert"
    assert h.dedupe_key == "example_webhook:e1"
    assert h.source_type == "integration"
    assert h.workspace_id == ws


def test_normalise_skips_bad_payload() -> None:
    adapter = ExampleWebhookAdapter()
    batch = adapter.normalise({"title": "Only title"}, workspace_id=uuid4(), integration_config={})
    assert batch.hypotheses == []


def test_title_prefix() -> None:
    adapter = ExampleWebhookAdapter()
    batch = adapter.normalise(
        {"title": "X", "external_id": "1"},
        workspace_id=uuid4(),
        integration_config={"title_prefix": "[ACME]"},
    )
    assert batch.hypotheses[0].title == "[ACME] X"
