#!/usr/bin/env python3
"""API smoke test against a running THMP stack (Traefik on port 80 by default).

Usage:
  SMOKE_BASE_URL=http://127.0.0.1 python3 scripts/smoke_api.py

Steps: register → create hypothesis → status transition → list audit (admin).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
import uuid


def http_json(
    method: str,
    url: str,
    *,
    data: dict | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, object | None]:
    h = dict(headers or {})
    body: bytes | None = None
    if data is not None:
        body = json.dumps(data).encode()
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            if not raw:
                return resp.status, None
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            detail: object = json.loads(raw)
        except json.JSONDecodeError:
            detail = raw
        raise RuntimeError(f"HTTP {e.code} {method} {url}: {detail}") from None


def main() -> None:
    base = os.environ.get("SMOKE_BASE_URL", "http://127.0.0.1").rstrip("/")
    email = f"smoke_{uuid.uuid4().hex[:12]}@example.com"
    password = "smokepass12"

    status, reg = http_json(
        "POST",
        f"{base}/api/v1/auth/register",
        data={"email": email, "password": password, "display_name": "Smoke User"},
    )
    if status not in (200, 201) or not isinstance(reg, dict):
        raise SystemExit(f"register failed: status={status} body={reg}")
    access = str(reg["access_token"])

    status, me = http_json(
        "GET",
        f"{base}/api/v1/users/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    if status != 200 or not isinstance(me, dict):
        raise SystemExit(f"/users/me failed: {status} {me}")
    workspaces = me.get("workspaces") or []
    if not workspaces:
        raise SystemExit("no workspaces on new user")
    ws = str(workspaces[0]["id"])

    status, hyp = http_json(
        "POST",
        f"{base}/api/v1/hypotheses",
        data={"title": "Smoke hypothesis", "description": ""},
        headers={"Authorization": f"Bearer {access}", "X-Workspace-Id": ws},
    )
    if status not in (200, 201) or not isinstance(hyp, dict):
        raise SystemExit(f"hypothesis create failed: {status} {hyp}")
    hid = str(hyp["id"])

    status, _patched = http_json(
        "PATCH",
        f"{base}/api/v1/hypotheses/{hid}",
        data={"status": "active", "transition_comment": "Promote to active for smoke test"},
        headers={"Authorization": f"Bearer {access}", "X-Workspace-Id": ws},
    )
    if status != 200:
        raise SystemExit(f"hypothesis patch failed: {status} {_patched}")

    status, audits = http_json(
        "GET",
        f"{base}/api/v1/audit/events?limit=50",
        headers={"Authorization": f"Bearer {access}"},
    )
    if status != 200 or not isinstance(audits, list):
        raise SystemExit(f"audit list failed: {status} {audits}")
    if len(audits) < 1:
        raise SystemExit("expected at least one audit event (check audit-service and THMP_INTERNAL_API_SECRET)")

    print(f"smoke ok: email={email} hypothesis={hid} audit_events={len(audits)}")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as e:
        print(e, file=sys.stderr)
        sys.exit(1)
