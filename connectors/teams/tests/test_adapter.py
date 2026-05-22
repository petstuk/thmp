from uuid import uuid4

from teams.adapter import TeamsNotifyAdapter


def test_teams_empty_hypotheses() -> None:
    ad = TeamsNotifyAdapter()
    b = ad.normalise(
        {"title": "t", "message": "m"},
        workspace_id=uuid4(),
        integration_config={"webhook_url": "https://outlook.office.com/webhook/x"},
    )
    assert b.hypotheses == []
