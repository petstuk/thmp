from uuid import uuid4

from pagerduty.adapter import PagerDutyAdapter


def test_pagerduty_ignores_low() -> None:
    ad = PagerDutyAdapter()
    b = ad.normalise(
        {"severity": "low", "summary": "x"},
        workspace_id=uuid4(),
        integration_config={"routing_key": "rk"},
    )
    assert b.hypotheses == []


def test_pagerduty_accepts_critical() -> None:
    ad = PagerDutyAdapter()
    b = ad.normalise(
        {"severity": "critical", "summary": "x"},
        workspace_id=uuid4(),
        integration_config={"routing_key": "rk"},
    )
    assert b.hypotheses == []
