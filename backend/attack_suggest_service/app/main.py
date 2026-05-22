"""ATT&CK auto-suggest sidecar service.

Provides semantic similarity-based technique suggestions using sentence-transformers.
"""
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.embedder import query, rebuild

logger = logging.getLogger(__name__)

ATTACK_SERVICE_URL = os.environ.get("ATTACK_SERVICE_URL", "http://attack-service:8000")


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    n = await rebuild(ATTACK_SERVICE_URL)
    if n == 0:
        logger.warning("suggest_service started with 0 technique embeddings — /rebuild when ATT&CK sync completes")
    yield


app = FastAPI(title="THMP ATT&CK Suggest Service", version="0.1.0", lifespan=lifespan)

_origins = [o.strip() for o in os.environ.get("THMP_CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health/live")
async def health_live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/attack/suggest")
async def suggest(
    text: str = Query(..., min_length=3),
    top_k: int = Query(5, ge=1, le=20),
) -> list[dict]:
    """Return ranked ATT&CK technique suggestions for the given text.

    Returns [{technique_id, label, score}] sorted by cosine similarity (desc).
    """
    return query(text, top_k=top_k)


@app.post("/api/v1/attack/suggest/rebuild", status_code=202)
async def trigger_rebuild() -> dict[str, str]:
    """Trigger re-embedding of ATT&CK techniques.

    Call this after a MITRE sync to keep suggestions current.
    Returns immediately; rebuild runs in background.
    """
    import asyncio
    asyncio.create_task(rebuild(ATTACK_SERVICE_URL))
    return {"status": "rebuilding"}
