"""Cross-entity full-text search endpoint backed by OpenSearch."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from typing import Any

from app.deps import get_workspace_context
from app.search import search as os_search
from thmp_common import TokenPayload

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search_entities(
    q: str = Query(..., min_length=1),
    types: str | None = Query(None, description="Comma-separated: hypothesis,evidence,finding"),
    size: int = Query(20, ge=1, le=100),
    ctx: tuple[TokenPayload, UUID, str] = Depends(get_workspace_context),
) -> list[dict[str, Any]]:
    """Search across hypotheses, evidence, and findings for the current workspace."""
    _, workspace_id, _ = ctx
    parsed_types: list[str] | None = None
    if types:
        parsed_types = [t.strip() for t in types.split(",") if t.strip()]
    return await os_search(q=q, workspace_id=str(workspace_id), types=parsed_types, size=size)
