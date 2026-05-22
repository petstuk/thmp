"""Set required env vars before any app module is imported."""
from __future__ import annotations

import os
import sys


def _prioritize_ingestion_editable_app() -> None:
    fnd = None
    for finder in sys.meta_path:
        mod = getattr(finder, "__module__", "") or ""
        if mod.startswith("__editable___thmp_ingestion_service"):
            fnd = finder
            break
    if fnd is None:
        return
    sys.meta_path.remove(fnd)
    sys.meta_path.insert(3, fnd)


for _k in list(sys.modules):
    if _k == "app" or _k.startswith("app."):
        del sys.modules[_k]
_prioritize_ingestion_editable_app()

os.environ.setdefault("USER_SERVICE_URL", "http://user-service-mock:8000")
os.environ.setdefault("HYPOTHESIS_SERVICE_URL", "http://hypothesis-service-mock:8000")
os.environ.setdefault("THMP_INTERNAL_API_SECRET", "test-internal")
