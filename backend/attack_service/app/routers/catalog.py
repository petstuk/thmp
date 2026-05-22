from __future__ import annotations

from urllib.parse import urlparse
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, get_workspace_context
from app.models import SyncMeta, Tactic, Technique, TechniqueTactic
from app.schemas import AttackCatalogStatusOut, TacticOut, TechniqueOut, TechniqueSummary

router = APIRouter(tags=["attack"])


def _source_url_display(url: str | None) -> str | None:
    if not url:
        return None
    try:
        p = urlparse(url)
        if p.netloc:
            return p.netloc
    except ValueError:
        pass
    return url[:120] + ("…" if len(url) > 120 else "")


@router.get("/status", response_model=AttackCatalogStatusOut)
async def catalog_status(
    ctx: tuple = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> AttackCatalogStatusOut:
    _ = ctx
    tactic_count = int(await db.scalar(select(func.count()).select_from(Tactic)) or 0)
    technique_count = int(await db.scalar(select(func.count()).select_from(Technique)) or 0)
    meta = (await db.execute(select(SyncMeta).limit(1))).scalar_one_or_none()
    last_sync = meta.last_sync_at if meta else None
    src = meta.source_url if meta else None
    bundle_ver = meta.bundle_attack_version if meta else None
    return AttackCatalogStatusOut(
        last_sync_at=last_sync,
        source_url_display=_source_url_display(src),
        bundle_attack_version=bundle_ver,
        tactic_count=tactic_count,
        technique_count=technique_count,
        catalog_ready=technique_count > 0,
    )


def _technique_to_summary(t: Technique) -> TechniqueSummary:
    return TechniqueSummary(
        id=t.id,
        stix_id=t.stix_id,
        mitre_id=t.mitre_id,
        name=t.name,
        is_subtechnique=t.is_subtechnique,
        parent_technique_id=t.parent_technique_id,
    )


@router.get("/techniques", response_model=list[TechniqueSummary])
async def list_techniques(
    q: str | None = Query(None, description="Typeahead on name or MITRE id"),
    tactic_id: UUID | None = Query(None),
    ids: str | None = Query(None, description="Comma-separated technique UUIDs (max 100)"),
    limit: int = Query(25, ge=1, le=100),
    ctx: tuple = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[TechniqueSummary]:
    _ = ctx
    stmt = select(Technique)
    if ids:
        raw = [s.strip() for s in ids.split(",") if s.strip()]
        id_list: list[UUID] = []
        for s in raw[:100]:
            try:
                id_list.append(UUID(s))
            except ValueError:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid UUID in ids: {s}") from None
        if not id_list:
            return []
        stmt = stmt.where(Technique.id.in_(id_list))
    else:
        if tactic_id is not None:
            stmt = stmt.join(TechniqueTactic).where(TechniqueTactic.tactic_id == tactic_id)
        if q and q.strip():
            pat = f"%{q.strip()}%"
            stmt = stmt.where(
                Technique.name.ilike(pat) | Technique.mitre_id.ilike(pat) | Technique.stix_id.ilike(pat)
            )
    stmt = stmt.order_by(Technique.mitre_id).limit(limit)
    rows = (await db.execute(stmt)).scalars().unique().all()
    return [_technique_to_summary(t) for t in rows]


@router.get("/techniques/{technique_id}", response_model=TechniqueOut)
async def get_technique(
    technique_id: UUID,
    ctx: tuple = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> TechniqueOut:
    _ = ctx
    t = (await db.execute(select(Technique).where(Technique.id == technique_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Technique not found")
    tt = (
        await db.execute(
            select(Tactic.short_name)
            .join(TechniqueTactic, TechniqueTactic.tactic_id == Tactic.id)
            .where(TechniqueTactic.technique_id == technique_id)
            .order_by(Tactic.short_name)
        )
    ).all()
    short_names = [r[0] for r in tt]
    return TechniqueOut(
        id=t.id,
        stix_id=t.stix_id,
        mitre_id=t.mitre_id,
        name=t.name,
        description=t.description,
        is_subtechnique=t.is_subtechnique,
        parent_technique_id=t.parent_technique_id,
        platforms=list(t.platforms) if t.platforms is not None else None,
        updated_at=t.updated_at,
        tactic_short_names=short_names,
    )


@router.get("/tactics", response_model=list[TacticOut])
async def list_tactics(
    ctx: tuple = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[TacticOut]:
    _ = ctx
    rows = (await db.execute(select(Tactic).order_by(Tactic.name))).scalars().all()
    return [
        TacticOut(
            id=r.id,
            stix_id=r.stix_id,
            name=r.name,
            short_name=r.short_name,
            description=r.description,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.get("/catalog/tactics")
async def catalog_tactics_with_techniques(
    ctx: tuple = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return all tactics with their techniques for the Navigator heatmap view."""
    _ = ctx
    tactics = (await db.execute(select(Tactic).order_by(Tactic.name))).scalars().all()
    result = []
    for tactic in tactics:
        techs_q = (
            select(Technique)
            .join(TechniqueTactic, TechniqueTactic.technique_id == Technique.id)
            .where(TechniqueTactic.tactic_id == tactic.id)
            .order_by(Technique.mitre_id)
        )
        techs = (await db.execute(techs_q)).scalars().unique().all()
        result.append(
            {
                "id": str(tactic.id),
                "name": tactic.name,
                "short_name": tactic.short_name,
                "techniques": [
                    {
                        "id": str(t.id),
                        "mitre_id": t.mitre_id,
                        "name": t.name,
                        "is_subtechnique": t.is_subtechnique,
                        "parent_technique_id": str(t.parent_technique_id) if t.parent_technique_id else None,
                    }
                    for t in techs
                ],
            }
        )
    return result
