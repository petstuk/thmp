from __future__ import annotations

import logging
import os
from collections import defaultdict
from datetime import datetime
from typing import Any
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.deps import get_workspace_context
from app.models import SyncMeta, Technique
from app.stix_parse import DEFAULT_BUNDLE_URL

router = APIRouter(tags=["attack"])
logger = logging.getLogger(__name__)


@router.get("/navigator-layer")
async def navigator_layer(
    request: Request,
    ctx: tuple = Depends(get_workspace_context),
    filter_status: str | None = Query(default=None, alias="status"),
    severity: str | None = Query(default=None),
    owner_id: UUID | None = Query(default=None),
    created_after: datetime | None = Query(default=None),
    created_before: datetime | None = Query(default=None),
) -> dict[str, Any]:
    """Build a MITRE Navigator v4.5-style layer from hypotheses in the workspace."""
    _payload, workspace_id, _role = ctx
    base = os.environ.get("HYPOTHESIS_SERVICE_URL", "").rstrip("/")
    if not base:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "HYPOTHESIS_SERVICE_URL not configured",
        )
    auth = request.headers.get("authorization")
    if not auth:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    url = f"{base}/api/v1/hypotheses"
    headers = {"Authorization": auth, "X-Workspace-Id": str(workspace_id)}
    params: dict[str, str] = {}
    if filter_status is not None:
        params["status"] = filter_status
    if severity is not None:
        params["severity"] = severity
    if owner_id is not None:
        params["owner_id"] = str(owner_id)
    if created_after is not None:
        params["created_after"] = created_after.isoformat()
    if created_before is not None:
        params["created_before"] = created_before.isoformat()
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, headers=headers, params=params or None)
        if resp.status_code != 200:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                f"hypothesis-service returned {resp.status_code}",
            )
        hypotheses = resp.json()
    if not isinstance(hypotheses, list):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Invalid hypotheses response")

    tech_comments: dict[str, list[str]] = defaultdict(list)
    tech_ids_needed: set[UUID] = set()
    for h in hypotheses:
        if not isinstance(h, dict):
            continue
        title = str(h.get("title", ""))
        raw_ids = h.get("attack_technique_ids")
        if not raw_ids:
            continue
        for tid in raw_ids:
            try:
                uid = UUID(str(tid))
            except ValueError:
                continue
            tech_ids_needed.add(uid)
            tech_comments[str(uid)].append(title)

    techniques_nav: list[dict[str, Any]] = []
    attack_version = "unknown"
    sync_url = os.environ.get("ALEMBIC_SYNC_URL", "").strip()
    if not sync_url:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "ALEMBIC_SYNC_URL not configured",
        )
    engine = create_engine(sync_url, pool_pre_ping=True)
    SessionMaker = sessionmaker(engine, class_=Session, expire_on_commit=False)
    by_id: dict[UUID, Technique] = {}
    try:
        with SessionMaker() as session:
            meta = session.execute(select(SyncMeta).limit(1)).scalar_one_or_none()
            if meta and meta.bundle_attack_version:
                attack_version = meta.bundle_attack_version
            if tech_ids_needed:
                rows = session.scalars(select(Technique).where(Technique.id.in_(tech_ids_needed))).all()
                by_id = {t.id: t for t in rows}
    except SQLAlchemyError as exc:
        logger.exception("navigator_layer failed DB read")
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "ATT&CK catalog database unavailable",
        ) from exc
    for uid in tech_ids_needed:
        t = by_id.get(uid)
        if not t:
            continue
        comments = tech_comments.get(str(uid), [])
        unique_titles = sorted(set(comments))
        comment = "; ".join(unique_titles)[:2000]
        score = min(len(unique_titles), 100) if unique_titles else 1
        techniques_nav.append(
            {
                "techniqueID": t.mitre_id,
                "score": score,
                "comment": comment or t.name,
            }
        )

    nav_app_ver = os.environ.get("THMP_NAVIGATOR_APP_VERSION", "4.9")

    return {
        "name": "THMP workspace layer",
        "domain": "enterprise-attack",
        "versions": {
            "attack": attack_version,
            "navigator": nav_app_ver,
            "layer": "4.5",
        },
        "description": f"Generated from workspace {workspace_id}; STIX source {os.environ.get('ATTACK_STIX_URL', DEFAULT_BUNDLE_URL)}",
        "techniques": sorted(techniques_nav, key=lambda x: x["techniqueID"]),
    }
