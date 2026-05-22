"""Sentence-transformer embedding state, loaded once at startup.

Keeps embeddings for ATT&CK techniques in memory as a numpy matrix.
Techniques are loaded from the attack-service internal API.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import httpx
import numpy as np

logger = logging.getLogger(__name__)

MODEL_NAME = os.environ.get("SUGGEST_MODEL", "all-MiniLM-L6-v2")

# Mutable module-level state — populated during lifespan.
_model = None
_technique_ids: list[str] = []
_technique_labels: list[str] = []
_embeddings: np.ndarray | None = None
_embed_lock = asyncio.Lock()


def _load_model():
    global _model
    if _model is not None:
        return _model
    from sentence_transformers import SentenceTransformer
    _model = SentenceTransformer(MODEL_NAME)
    return _model


async def rebuild(attack_base_url: str) -> int:
    """Fetch all techniques from attack-service and rebuild the embedding matrix."""
    global _technique_ids, _technique_labels, _embeddings
    async with _embed_lock:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(f"{attack_base_url}/api/v1/attack/internal/techniques")
                resp.raise_for_status()
                techniques: list[dict[str, Any]] = resp.json()
        except Exception:
            logger.warning("Could not fetch techniques from attack-service", exc_info=True)
            return 0

        if not techniques:
            return 0

        texts = [
            f"{t.get('technique_id', '')} {t.get('name', '')} {t.get('description', '') or ''}"
            for t in techniques
        ]
        ids = [str(t["id"]) for t in techniques]

        model = await asyncio.to_thread(_load_model)
        vecs = await asyncio.to_thread(model.encode, texts, normalize_embeddings=True)
        _technique_ids = ids
        _technique_labels = [f"{t.get('technique_id', '')} — {t.get('name', '')}" for t in techniques]
        _embeddings = vecs
        logger.info("attack_suggest rebuilt embeddings n=%s", len(ids))
        return len(ids)


def query(text: str, top_k: int = 5) -> list[dict]:
    """Return top-k technique suggestions for text. Returns [] if not ready."""
    if _embeddings is None or _model is None:
        return []
    model = _model
    vec = model.encode([text], normalize_embeddings=True)[0]
    scores = (_embeddings @ vec).tolist()
    ranked = sorted(zip(scores, _technique_ids, _technique_labels), key=lambda x: x[0], reverse=True)
    return [
        {"technique_id": tid, "label": label, "score": round(score, 4)}
        for score, tid, label in ranked[:top_k]
    ]
