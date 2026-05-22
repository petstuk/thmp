"""Test bootstrap: DATABASE_URL is required at import-time by app.db."""

from __future__ import annotations

import os
import sys


def _prioritize_reporting_editable_app() -> None:
    reporting_finder = None
    for finder in sys.meta_path:
        mod = getattr(finder, "__module__", "") or ""
        if mod.startswith("__editable___thmp_reporting_service"):
            reporting_finder = finder
            break
    if reporting_finder is None:
        return
    sys.meta_path.remove(reporting_finder)
    sys.meta_path.insert(3, reporting_finder)


for _k in list(sys.modules):
    if _k == "app" or _k.startswith("app."):
        del sys.modules[_k]
_prioritize_reporting_editable_app()

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://thmp:thmp@127.0.0.1:5432/thmp")
os.environ.setdefault("THMP_JWT_SECRET", "test-secret-key-for-tests-only")
os.environ.setdefault("THMP_JWT_ISSUER", "thmp-local")
os.environ.setdefault("THMP_JWT_AUDIENCE", "thmp-users")
