from __future__ import annotations

import asyncio
import os

import httpx
from fastapi import APIRouter, Depends

from app.deps import get_workspace_context, require_workspace_admin
from app.schemas import SyncOut
from app.stix_ingest import ingest_bundle_bytes
from app.stix_parse import DEFAULT_BUNDLE_URL

router = APIRouter(tags=["attack-admin"])


@router.post("/sync", response_model=SyncOut)
async def sync_attack_catalog(
    ctx: tuple = Depends(get_workspace_context),
) -> SyncOut:
    _payload, _workspace_id, role = ctx
    require_workspace_admin(role)
    url = os.environ.get("ATTACK_STIX_URL", DEFAULT_BUNDLE_URL)
    sync_url = os.environ["ALEMBIC_SYNC_URL"]
    async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        raw = resp.content
    stats = await asyncio.to_thread(ingest_bundle_bytes, raw, sync_url)
    return SyncOut(tactics=stats["tactics"], techniques=stats["techniques"])
