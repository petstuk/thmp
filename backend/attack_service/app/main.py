import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, catalog, internal, navigator

app = FastAPI(title="THMP ATT&CK Service", version="0.1.0")

_origins = [o.strip() for o in os.environ.get("THMP_CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router, prefix="/api/v1/attack")
app.include_router(admin.router, prefix="/api/v1/attack")
app.include_router(internal.router, prefix="/api/v1/attack")
app.include_router(navigator.router, prefix="/api/v1/attack")


@app.get("/health/live")
async def health_live() -> dict[str, str]:
    return {"status": "ok"}
