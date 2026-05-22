from __future__ import annotations

import json
import logging
import os
import smtplib
from email.message import EmailMessage
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch

logger = logging.getLogger(__name__)


def send_smtp_email(
    host: str,
    port: int,
    user: str,
    password: str,
    from_addr: str,
    to_addrs: list[str],
    subject: str,
    body: str,
) -> None:
    if os.environ.get("THMP_CONNECTOR_LIVE_HTTP") != "1":
        logger.info("SMTP send skipped: %s", subject)
        return
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(to_addrs)
    msg.set_content(body)
    with smtplib.SMTP(host, port, timeout=30) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(msg)


class EmailSmtpAdapter(ConnectorAdapter):
    connector_id = "email_smtp"
    version = "0.1.0"

    def health_check(self, integration_config: dict[str, Any]) -> bool:
        return bool(integration_config.get("smtp_host") and integration_config.get("from_address"))

    def normalise(
        self,
        raw_payload: bytes | dict[str, Any],
        *,
        workspace_id: UUID,
        integration_config: dict[str, Any],
    ) -> NormalisedBatch:
        if isinstance(raw_payload, bytes):
            try:
                data = json.loads(raw_payload.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                return NormalisedBatch()
        else:
            data = raw_payload
        if not isinstance(data, dict):
            return NormalisedBatch()
        mode = str(data.get("mode") or "alert")
        host = str(integration_config.get("smtp_host") or "")
        port = int(integration_config.get("smtp_port") or 587)
        user = str(integration_config.get("smtp_user") or "")
        password = str(integration_config.get("smtp_password") or "")
        from_addr = str(integration_config.get("from_address") or "")
        raw_to = integration_config.get("to_addresses") or ""
        if isinstance(raw_to, str):
            to_addrs = [x.strip() for x in raw_to.split(",") if x.strip()]
        else:
            to_addrs = [str(x) for x in raw_to]
        if host and from_addr and to_addrs:
            subj = f"[THMP] {mode}: {data.get('title', 'notification')}"
            body = str(data.get("body") or data.get("message") or "")
            send_smtp_email(host, port, user, password, from_addr, to_addrs, subj, body)
        return NormalisedBatch()
