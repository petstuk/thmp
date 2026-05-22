from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Evidence, Hypothesis, WorkspaceScoringSettings

DEFAULT_WEIGHTS: dict[str, float] = {"analyst": 0.4, "evidence": 0.4, "signal": 0.2}


async def get_workspace_weights(db: AsyncSession, workspace_id: UUID) -> dict[str, float]:
    row = (
        await db.execute(select(WorkspaceScoringSettings).where(WorkspaceScoringSettings.workspace_id == workspace_id))
    ).scalar_one_or_none()
    if not row or not row.weights:
        return dict(DEFAULT_WEIGHTS)
    w = dict(DEFAULT_WEIGHTS)
    for k, v in row.weights.items():
        if k in w and isinstance(v, (int, float)):
            w[k] = float(v)
    s = sum(w.values())
    if s <= 0:
        return dict(DEFAULT_WEIGHTS)
    return {k: w[k] / s for k in w}


def analyst_factor(h: Hypothesis) -> float:
    if h.analyst_confidence_1_5 is None:
        return 0.5
    return max(0.0, min(1.0, h.analyst_confidence_1_5 / 5.0))


def signal_factor(h: Hypothesis) -> float:
    if h.signal_strength_0_1 is not None:
        return max(0.0, min(1.0, float(h.signal_strength_0_1)))
    ref = h.source_ref if isinstance(h.source_ref, dict) else None
    if ref and isinstance(ref.get("signal_strength"), (int, float)):
        return max(0.0, min(1.0, float(ref["signal_strength"])))
    return 0.3


def evidence_factor(evidence_items: list[Evidence]) -> float:
    if not evidence_items:
        return 0.0
    total = 0.0
    for e in evidence_items:
        w = max(0.0, min(1.0, float(e.weight)))
        sign = 1.0 if e.supports_hypothesis else -0.3
        total += w * sign
    # Normalise to 0..1 roughly
    return max(0.0, min(1.0, 0.35 + 0.65 * (total / max(1.0, len(evidence_items) ** 0.5))))


async def recompute_hypothesis_confidence(db: AsyncSession, h: Hypothesis) -> float:
    weights = await get_workspace_weights(db, h.workspace_id)
    ev_rows = list((await db.execute(select(Evidence).where(Evidence.hypothesis_id == h.id))).scalars().all())
    a = analyst_factor(h)
    ev = evidence_factor(ev_rows)
    sig = signal_factor(h)
    score = weights["analyst"] * a + weights["evidence"] * ev + weights["signal"] * sig
    score = max(0.0, min(1.0, float(score)))
    h.confidence_score = score
    return score
