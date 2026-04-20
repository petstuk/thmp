#!/usr/bin/env python3
"""API smoke test against a running THMP stack (Traefik on port 80 by default).

Usage:
  SMOKE_BASE_URL=http://127.0.0.1 python3 scripts/smoke_api.py

Steps: register → ATT&CK sync (admin) → technique search → hypothesis with technique → status transition → audit → Navigator layer.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path


def _load_dotenv_defaults() -> None:
    """Populate missing os.environ from repo-root .env (no extra dependency)."""
    root = Path(__file__).resolve().parents[1]
    path = root / ".env"
    if not path.is_file():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def http_json(
    method: str,
    url: str,
    *,
    data: dict | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 60,
) -> tuple[int, object | None]:
    h = dict(headers or {})
    body: bytes | None = None
    if data is not None:
        body = json.dumps(data).encode()
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
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
    _load_dotenv_defaults()
    base = os.environ.get("SMOKE_BASE_URL", "http://127.0.0.1").rstrip("/")
    ingest_base = os.environ.get("SMOKE_INGEST_URL", "http://127.0.0.1:8005").rstrip("/")
    internal = os.environ.get("THMP_INTERNAL_API_SECRET", "")
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
    user_id = str(me["id"])
    workspaces = me.get("workspaces") or []
    if not workspaces:
        raise SystemExit("no workspaces on new user")
    ws = str(workspaces[0]["id"])
    ws_headers = {"Authorization": f"Bearer {access}", "X-Workspace-Id": ws}

    status, _integ = http_json(
        "POST",
        f"{base}/api/v1/integrations",
        data={
            "connector_id": "example_webhook",
            "config": {"ingest_actor_user_id": user_id},
        },
        headers=ws_headers,
    )
    if status not in (200, 201):
        raise SystemExit(f"integration create failed: {status} {_integ}")

    if not internal:
        raise SystemExit("THMP_INTERNAL_API_SECRET must be set for ingest smoke (see .env)")

    ing_status, ing_body = http_json(
        "POST",
        f"{ingest_base}/api/v1/ingest/batch",
        data={
            "workspace_id": ws,
            "connector_id": "example_webhook",
            "raw_payload": {
                "title": "Smoke ingest hypothesis",
                "body": "Created by smoke_api ingest path",
                "external_id": f"smoke-{uuid.uuid4().hex[:10]}",
            },
        },
        headers={"X-Internal-Token": internal},
    )
    if ing_status not in (200, 201) or not isinstance(ing_body, dict):
        raise SystemExit(f"ingest batch failed: {ing_status} {ing_body}")
    hyp_results = ing_body.get("hypotheses") or []
    if len(hyp_results) < 1:
        raise SystemExit("ingest returned no hypotheses")

    triage_status, triage = http_json(
        "GET",
        f"{base}/api/v1/hypotheses?integration_queue=true",
        headers=ws_headers,
    )
    if triage_status != 200 or not isinstance(triage, list):
        raise SystemExit(f"triage list failed: {triage_status} {triage}")
    if len(triage) < 1:
        raise SystemExit("expected at least one hypothesis in triage queue after ingest")

    sync_status, sync_body = http_json(
        "POST", f"{base}/api/v1/attack/sync", headers=ws_headers, timeout=300
    )
    if sync_status not in (200, 201):
        raise SystemExit(f"attack sync failed: {sync_status} {sync_body}")

    status, techs = http_json("GET", f"{base}/api/v1/attack/techniques?limit=1", headers=ws_headers)
    tech_ids: list[str] = []
    if status == 200 and isinstance(techs, list) and techs and isinstance(techs[0], dict):
        tid = techs[0].get("id")
        if tid:
            tech_ids = [str(tid)]

    hyp_body: dict = {"title": "Smoke hypothesis", "description": ""}
    if tech_ids:
        hyp_body["attack_technique_ids"] = tech_ids

    status, hyp = http_json(
        "POST",
        f"{base}/api/v1/hypotheses",
        data=hyp_body,
        headers=ws_headers,
    )
    if status not in (200, 201) or not isinstance(hyp, dict):
        raise SystemExit(f"hypothesis create failed: {status} {hyp}")
    hid = str(hyp["id"])

    status, _patched = http_json(
        "PATCH",
        f"{base}/api/v1/hypotheses/{hid}",
        data={"status": "active", "transition_comment": "Promote to active for smoke test"},
        headers=ws_headers,
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

    status, layer = http_json("GET", f"{base}/api/v1/attack/navigator-layer", headers=ws_headers)
    if status != 200 or not isinstance(layer, dict):
        raise SystemExit(f"navigator-layer failed: {status} {layer}")
    techniques = layer.get("techniques")
    if not isinstance(techniques, list):
        raise SystemExit("navigator-layer missing techniques array")

    print(
        f"smoke ok: email={email} hypothesis={hid} integration_queued={len(triage)} "
        f"audit_events={len(audits)} navigator_techniques={len(techniques)}"
    )


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as e:
        print(e, file=sys.stderr)
        sys.exit(1)
