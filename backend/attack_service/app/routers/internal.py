from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_internal_token
from app.models import Technique
from app.schemas import ValidateTechniqueIdsRequest, ValidateTechniqueIdsResponse

router = APIRouter(prefix="/internal", tags=["attack-internal"])


@router.post("/validate-technique-ids", response_model=ValidateTechniqueIdsResponse)
async def validate_technique_ids(
    body: ValidateTechniqueIdsRequest,
    _: None = Depends(require_internal_token),
    db: AsyncSession = Depends(get_db),
) -> ValidateTechniqueIdsResponse:
    if not body.ids:
        return ValidateTechniqueIdsResponse(missing=[])
    rows = (await db.execute(select(Technique.id).where(Technique.id.in_(body.ids)))).scalars().all()
    found = set(rows)
    missing = [i for i in body.ids if i not in found]
    return ValidateTechniqueIdsResponse(missing=missing)


@router.get("/techniques")
async def list_all_techniques_for_suggest(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return all techniques with their descriptions for embedding by the suggest service.

    No auth required — this endpoint is internal-only via service networking.
    """
    rows = (
        await db.execute(
            select(
                Technique.id,
                Technique.technique_id,
                Technique.name,
                Technique.description,
            )
        )
    ).all()
    return [
        {
            "id": str(r.id),
            "technique_id": r.technique_id,
            "name": r.name,
            "description": (r.description or "")[:2000],
        }
        for r in rows
    ]
