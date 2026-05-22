from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import jobs, schedules, templates
from app.storage import ensure_bucket_sync

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    try:
        ensure_bucket_sync()
    except Exception:  # noqa: BLE001
        logger.warning("Could not ensure reports S3 bucket", exc_info=True)
    yield


app = FastAPI(title="THMP Reporting Service", version="0.1.0", lifespan=lifespan)

_origins = [o.strip() for o in os.environ.get("THMP_CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(templates.router, prefix="/api/v1/reports")
app.include_router(jobs.router, prefix="/api/v1/reports")
app.include_router(schedules.router, prefix="/api/v1/reports")


@app.get("/health/live")
async def health_live() -> dict[str, str]:
    return {"status": "ok"}
