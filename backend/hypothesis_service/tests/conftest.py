"""Test bootstrap: DB URL required at import time by app.db."""

from __future__ import annotations

import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://thmp:thmp@127.0.0.1:5432/thmp",
)
