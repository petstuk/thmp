from __future__ import annotations

import os
from typing import Annotated

from fastapi import Header, HTTPException, status


def require_internal_token(x_internal_token: Annotated[str | None, Header()] = None) -> None:
    expected = os.environ.get("THMP_INTERNAL_API_SECRET", "")
    if not expected or x_internal_token != expected:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid internal token")
