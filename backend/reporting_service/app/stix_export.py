from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


def build_stix_bundle(context: dict) -> dict:
    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    workspace_id = str(context.get("workspace_id", "unknown"))
    title = str(context.get("title", "THMP Report"))
    technique_refs = []
    for tid in context.get("technique_stix_ids", []):
        if isinstance(tid, str) and tid.startswith("attack-pattern--"):
            technique_refs.append(tid)
    report_id = f"report--{uuid4()}"
    identity_id = f"identity--{uuid4()}"
    report_obj = {
        "type": "report",
        "spec_version": "2.1",
        "id": report_id,
        "created": now,
        "modified": now,
        "name": title,
        "published": now,
        "object_refs": technique_refs,
        "labels": [f"workspace:{workspace_id}", f"report_type:{context.get('report_type', 'summary')}"],
        "description": str(context.get("summary", ""))[:4000],
    }
    ident = {
        "type": "identity",
        "spec_version": "2.1",
        "id": identity_id,
        "created": now,
        "modified": now,
        "name": f"THMP Workspace {workspace_id}",
        "identity_class": "organization",
    }
    return {"type": "bundle", "id": f"bundle--{uuid4()}", "objects": [ident, report_obj]}
