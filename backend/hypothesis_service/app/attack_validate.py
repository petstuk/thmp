from __future__ import annotations

import os
from uuid import UUID

import httpx
from fastapi import HTTPException, status


async def ensure_technique_ids_exist(attack_technique_ids: list[UUID] | None) -> None:
    if not attack_technique_ids:
        return
    base = os.environ.get("ATTACK_SERVICE_URL", "").strip().rstrip("/")
    if not base:
        return
    secret = os.environ.get("THMP_INTERNAL_API_SECRET", "")
    if not secret:
        return
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base}/api/v1/attack/internal/validate-technique-ids",
                json={"ids": [str(x) for x in attack_technique_ids]},
                headers={"X-Internal-Token": secret},
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=[
                {
                    "type": "attack_service_unreachable",
                    "msg": "attack-service unreachable for technique validation",
                }
            ],
        ) from exc
    if resp.status_code != 200:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=[
                {
                    "type": "attack_service_error",
                    "msg": f"attack-service validation failed: HTTP {resp.status_code}",
                }
            ],
        )
    data = resp.json()
    missing_raw = data.get("missing") or []
    if not missing_raw:
        return
    missing: list[str] = [str(m) for m in missing_raw]
    raise HTTPException(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=[
            {
                "type": "unknown_attack_technique_ids",
                "msg": f"Unknown attack_technique_ids: {missing[:20]}",
            }
        ],
    )
