import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.file_storage import ensure_bucket_sync
from app.routers import evidence, hypotheses, hunts, internal_hypotheses
from app.routers.search import router as search_router
from app.routers.workspace_workflow import kanban_router, notifications_router, scoring_router
from app.search import ensure_indices

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    try:
        ensure_bucket_sync()
    except Exception:
        logger.warning("Could not ensure S3 bucket — evidence upload may fail", exc_info=True)
    try:
        await ensure_indices()
    except Exception:
        logger.warning("Could not ensure OpenSearch indices", exc_info=True)
    yield


app = FastAPI(title="THMP Hypothesis Service", version="0.1.0", lifespan=lifespan)

_origins = [o.strip() for o in os.environ.get("THMP_CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hypotheses.router, prefix="/api/v1")
app.include_router(internal_hypotheses.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")
app.include_router(hunts.router, prefix="/api/v1")
app.include_router(scoring_router, prefix="/api/v1")
app.include_router(kanban_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")


@app.get("/health/live")
async def health_live() -> dict[str, str]:
    return {"status": "ok"}
