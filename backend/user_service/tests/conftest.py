"""Set required env vars before any app module is imported."""
from __future__ import annotations

import os
import sys


def _prioritize_user_editable_app() -> None:
    """``import app`` from multiple THMP services in one venv: prefer this service."""
    fnd = None
    for finder in sys.meta_path:
        mod = getattr(finder, "__module__", "") or ""
        if mod.startswith("__editable___thmp_user_service"):
            fnd = finder
            break
    if fnd is None:
        return
    sys.meta_path.remove(fnd)
    sys.meta_path.insert(3, fnd)


for _k in list(sys.modules):
    if _k == "app" or _k.startswith("app."):
        del sys.modules[_k]
_prioritize_user_editable_app()

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://thmp:thmp@127.0.0.1:5432/thmp")
os.environ.setdefault("THMP_JWT_SECRET", "test-secret-key-for-tests-only")
os.environ.setdefault("THMP_INTERNAL_API_SECRET", "test-internal")
os.environ.setdefault("AUDIT_SERVICE_URL", "http://localhost:9999")
