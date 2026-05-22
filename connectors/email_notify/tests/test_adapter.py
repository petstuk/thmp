from uuid import uuid4

from email_notify.adapter import EmailSmtpAdapter


def test_email_empty_hypotheses() -> None:
    ad = EmailSmtpAdapter()
    b = ad.normalise(
        {"mode": "alert", "title": "t", "body": "b"},
        workspace_id=uuid4(),
        integration_config={
            "smtp_host": "smtp.example.com",
            "from_address": "a@b.com",
            "to_addresses": "c@b.com",
        },
    )
    assert b.hypotheses == []
