"""Test bootstrap: DB URL required at import time by app.db."""

from __future__ import annotations

import os
import sys


def _prioritize_hypothesis_editable_app() -> None:
    """Several THMP services use a top-level ``app`` package; editable installs register
    meta path finders in a fixed order, so ``import app`` can resolve to the wrong
    service. Move this service's finder ahead of the other ``app`` finders."""
    hypothesis_finder = None
    for finder in sys.meta_path:
        # meta_path stores finder classes; their __module__ is the generated editable helper.
        mod = getattr(finder, "__module__", "") or ""
        if mod.startswith("__editable___thmp_hypothesis_service"):
            hypothesis_finder = finder
            break
    if hypothesis_finder is None:
        return
    sys.meta_path.remove(hypothesis_finder)
    sys.meta_path.insert(3, hypothesis_finder)


# Editable multi-service venvs may have imported another service's ``app`` before this file runs.
for _k in list(sys.modules):
    if _k == "app" or _k.startswith("app."):
        del sys.modules[_k]
_prioritize_hypothesis_editable_app()

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://thmp:thmp@127.0.0.1:5432/thmp",
)
