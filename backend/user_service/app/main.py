import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, integrations, internal_integrations, users, workspaces

app = FastAPI(title="THMP User Service", version="0.1.0")

_origins = [o.strip() for o in os.environ.get("THMP_CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(workspaces.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")
app.include_router(internal_integrations.router, prefix="/api/v1")


@app.get("/health/live")
async def health_live() -> dict[str, str]:
    return {"status": "ok"}
