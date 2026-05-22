from uuid import uuid4

from slack.adapter import SlackNotifyAdapter


def test_slack_returns_empty_batch() -> None:
    ad = SlackNotifyAdapter()
    b = ad.normalise(
        {"event_type": "hypothesis.validated", "message": "ok"},
        workspace_id=uuid4(),
        integration_config={"webhook_url": "https://hooks.slack.com/x"},
    )
    assert b.hypotheses == []
