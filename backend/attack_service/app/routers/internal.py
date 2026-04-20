from __future__ import annotations

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
