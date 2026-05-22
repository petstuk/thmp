from __future__ import annotations

import os
from datetime import datetime, timezone
from uuid import UUID

import httpx


async def _get_json(url: str, headers: dict[str, str], params: dict | None = None) -> object:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, headers=headers, params=params)
    if resp.status_code != 200:
        raise RuntimeError(f"upstream returned {resp.status_code} for {url}")
    return resp.json()


def _common_headers(access_token: str, workspace_id: UUID) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "X-Workspace-Id": str(workspace_id),
    }


def _report_title(report_type: str) -> str:
    return {
        "hypothesis": "Hypothesis Report",
        "hunt": "Hunt Report",
        "coverage": "Coverage Report",
        "summary": "Workspace Summary Report",
    }.get(report_type, "THMP Report")


async def build_report_context(report_type: str, workspace_id: UUID, params: dict, access_token: str) -> dict:
    headers = _common_headers(access_token, workspace_id)
    hypothesis_base = os.environ.get("HYPOTHESIS_SERVICE_URL", "").rstrip("/")
    attack_base = os.environ.get("ATTACK_SERVICE_URL", "").rstrip("/")
    user_base = os.environ.get("USER_SERVICE_URL", "").rstrip("/")
    if not hypothesis_base or not attack_base or not user_base:
        raise RuntimeError("Required upstream URLs are not configured")
    ws_name = str(workspace_id)
    try:
        workspaces = await _get_json(f"{user_base}/api/v1/workspaces", headers)
        if isinstance(workspaces, dict):
            for ws in workspaces.get("workspaces", []):
                if isinstance(ws, dict) and str(ws.get("id")) == str(workspace_id):
                    ws_name = str(ws.get("name", ws_name))
                    break
    except Exception:  # noqa: BLE001
        ws_name = str(workspace_id)

    generated_at = datetime.now(tz=timezone.utc).isoformat()
    ctx: dict = {
        "report_type": report_type,
        "workspace_id": str(workspace_id),
        "workspace_name": ws_name,
        "generated_at": generated_at,
        "title": _report_title(report_type),
        "summary": "",
        "sections": [],
        "technique_stix_ids": [],
    }

    if report_type == "hypothesis":
        hyp_id = params.get("hypothesis_id")
        if not hyp_id:
            raise RuntimeError("hypothesis_id is required")
        hyp = await _get_json(f"{hypothesis_base}/api/v1/hypotheses/{hyp_id}", headers)
        evidence = await _get_json(f"{hypothesis_base}/api/v1/hypotheses/{hyp_id}/evidence", headers)
        activity = await _get_json(f"{hypothesis_base}/api/v1/hypotheses/{hyp_id}/activity", headers)
        h = hyp if isinstance(hyp, dict) else {}
        ctx["title"] = f"Hypothesis Report - {h.get('title', hyp_id)}"
        ctx["summary"] = str(h.get("description", ""))
        ctx["sections"] = [
            {"title": "Status", "body": str(h.get("status", "unknown"))},
            {"title": "Severity", "body": str(h.get("severity", "unknown"))},
            {"title": "Evidence", "lines": [str(x.get("title", "item")) for x in evidence if isinstance(x, dict)]},
            {"title": "Activity", "lines": [str(x.get("summary", "event")) for x in activity if isinstance(x, dict)]},
        ]
        raw_tids = h.get("attack_technique_ids") or []
        for tid in raw_tids:
            if isinstance(tid, str):
                ctx["technique_stix_ids"].append(tid)
        return ctx

    if report_type == "hunt":
        hunt_id = params.get("hunt_id")
        if not hunt_id:
            raise RuntimeError("hunt_id is required")
        hunt = await _get_json(f"{hypothesis_base}/api/v1/hunts/{hunt_id}", headers)
        timeline = await _get_json(f"{hypothesis_base}/api/v1/hunts/{hunt_id}/timeline", headers)
        findings = await _get_json(f"{hypothesis_base}/api/v1/hunts/findings", headers)
        h = hunt if isinstance(hunt, dict) else {}
        f_items = [x for x in findings if isinstance(x, dict) and str(x.get("hunt_id")) == str(hunt_id)]
        ctx["title"] = f"Hunt Report - {h.get('name', hunt_id)}"
        ctx["summary"] = str(h.get("description", ""))
        ctx["sections"] = [
            {"title": "Outcome", "body": f"Status: {h.get('status', 'unknown')}"},
            {"title": "Timeline", "lines": [str(x.get("message", "event")) for x in timeline if isinstance(x, dict)]},
            {"title": "Findings", "lines": [str(x.get("title", "finding")) for x in f_items]},
        ]
        return ctx

    if report_type == "coverage":
        layer = await _get_json(f"{attack_base}/api/v1/attack/navigator-layer", headers)
        tactics = await _get_json(f"{attack_base}/api/v1/attack/tactics", headers)
        techs = list(layer.get("techniques", [])) if isinstance(layer, dict) else []
        zero_cov = [t for t in techs if int(t.get("score", 0)) <= 0]
        ctx["title"] = "Coverage Report"
        ctx["summary"] = f"{len(techs)} techniques in layer; {len(zero_cov)} uncovered"
        ctx["sections"] = [
            {"title": "Coverage Summary", "body": ctx["summary"]},
            {"title": "Gaps", "lines": [str(t.get("techniqueID", "unknown")) for t in zero_cov[:50]]},
            {
                "title": "Tactics",
                "lines": [str(x.get("name", "tactic")) for x in tactics if isinstance(x, dict)][:50],
            },
        ]
        ctx["technique_stix_ids"] = [
            str(t.get("techniqueID")) for t in techs if isinstance(t, dict) and t.get("techniqueID")
        ]
        return ctx

    if report_type == "summary":
        hyps = await _get_json(f"{hypothesis_base}/api/v1/hypotheses", headers)
        hunts = await _get_json(f"{hypothesis_base}/api/v1/hunts", headers)
        findings = await _get_json(f"{hypothesis_base}/api/v1/hunts/findings", headers)
        statuses: dict[str, int] = {}
        for item in hyps if isinstance(hyps, list) else []:
            if not isinstance(item, dict):
                continue
            st = str(item.get("status", "unknown"))
            statuses[st] = statuses.get(st, 0) + 1
        ctx["title"] = "Workspace Summary Report"
        ctx["summary"] = f"{len(hyps)} hypotheses, {len(hunts)} hunts, {len(findings)} findings"
        ctx["sections"] = [
            {"title": "KPI", "body": ctx["summary"]},
            {"title": "Hypotheses by status", "lines": [f"{k}: {v}" for k, v in sorted(statuses.items())]},
            {"title": "Hunts", "lines": [str(x.get("name", "hunt")) for x in hunts if isinstance(x, dict)][:50]},
        ]
        return ctx

    raise RuntimeError(f"unsupported report_type: {report_type}")
