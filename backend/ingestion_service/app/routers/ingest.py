from __future__ import annotations

import logging
import os
from typing import Any
from urllib.parse import urlencode
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ValidationError
from thmp_cdk.types import NormalisedHypothesis

from app.connectors import load_connector_adapter
from app.deps import require_internal_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestBatchRequest(BaseModel):
    workspace_id: UUID
    connector_id: str = Field(max_length=64)
    raw_payload: dict[str, Any]
    ingest_actor_user_id: UUID | None = None


class IngestItemOutcome(BaseModel):
    id: UUID
    created: bool


class SkippedHypothesis(BaseModel):
    """Row skipped after connector normalise (validation failed)."""

    reason: str
    detail: str | None = None


class IngestBatchResponse(BaseModel):
    hypotheses: list[IngestItemOutcome]
    skipped_hypotheses: list[SkippedHypothesis] = Field(default_factory=list)


def _resolve_actor_uuid(config: dict[str, Any], body: IngestBatchRequest) -> UUID:
    if body.ingest_actor_user_id is not None:
        return body.ingest_actor_user_id
    raw = config.get("ingest_actor_user_id")
    if raw is not None:
        return UUID(str(raw))
    env_actor = os.environ.get("THMP_INGEST_DEFAULT_ACTOR_USER_ID", "").strip()
    if env_actor:
        return UUID(env_actor)
    raise ValueError(
        "ingest_actor_user_id required (request body, integration config, or THMP_INGEST_DEFAULT_ACTOR_USER_ID)"
    )


def _coerce_normalised_hypothesis(item: Any) -> NormalisedHypothesis:
    if isinstance(item, NormalisedHypothesis):
        return item
    if isinstance(item, dict):
        return NormalisedHypothesis.model_validate(item)
    raise TypeError(f"expected NormalisedHypothesis or dict, got {type(item).__name__}")


@router.post("/batch", response_model=IngestBatchResponse)
async def ingest_batch(
    body: IngestBatchRequest,
    _: None = Depends(require_internal_token),
) -> IngestBatchResponse:
    user_base = os.environ.get("USER_SERVICE_URL", "").rstrip("/")
    hyp_base = os.environ.get("HYPOTHESIS_SERVICE_URL", "").rstrip("/")
    api_secret = os.environ.get("THMP_INTERNAL_API_SECRET", "")
    if not user_base or not hyp_base or not api_secret:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "USER_SERVICE_URL, HYPOTHESIS_SERVICE_URL, and THMP_INTERNAL_API_SECRET must be set",
        )

    integ_url = (
        f"{user_base}/api/v1/internal/integrations/workspace/{body.workspace_id}"
        f"?{urlencode({'connector_id': body.connector_id})}"
    )
    adapter = load_connector_adapter(body.connector_id)
    if adapter.connector_id != body.connector_id:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Connector package id mismatch",
        )

    skipped: list[SkippedHypothesis] = []
    outcomes: list[IngestItemOutcome] = []
    created_count = 0
    deduped_count = 0
    n_raw = 0

    async with httpx.AsyncClient(timeout=60.0) as client:
        integ_resp = await client.get(integ_url, headers={"X-Internal-Token": api_secret})
        if integ_resp.status_code == 404:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Integration not found or disabled")
        integ_resp.raise_for_status()
        integ = integ_resp.json()
        config = integ.get("config") or {}
        try:
            actor = _resolve_actor_uuid(config, body)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

        batch = adapter.normalise(
            body.raw_payload,
            workspace_id=body.workspace_id,
            integration_config=config,
        )

        n_raw = len(batch.hypotheses)
        if n_raw == 0:
            logger.info(
                "ingest_batch_empty connector_id=%s workspace_id=%s hypotheses_from_connector=0",
                body.connector_id,
                body.workspace_id,
            )

        ingest_url = f"{hyp_base}/api/v1/internal/hypotheses/ingest-item"

        for item in batch.hypotheses:
            try:
                nh = _coerce_normalised_hypothesis(item)
            except (ValidationError, TypeError) as exc:
                detail = str(exc) if isinstance(exc, TypeError) else str(exc.errors())[:800]
                skipped.append(SkippedHypothesis(reason="validation_error", detail=detail))
                continue

            vendor_ref = dict(nh.source_ref) if nh.source_ref else {}
            vendor_ref.pop("ingest", None)
            payload = {
                "workspace_id": str(body.workspace_id),
                "created_by": str(actor),
                "title": nh.title,
                "description": nh.description,
                "severity": nh.severity,
                "source_type": nh.source_type,
                "source_ref": vendor_ref or None,
                "metadata": nh.metadata,
                "dedupe_key": nh.dedupe_key,
                "connector_id": body.connector_id,
            }
            resp = await client.post(
                ingest_url,
                json=payload,
                headers={"X-Internal-Token": api_secret},
            )
            if resp.status_code not in (200, 201):
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    f"Hypothesis ingest failed: {resp.status_code} {resp.text}",
                )
            data = resp.json()
            created = bool(data.get("created", True))
            if created:
                created_count += 1
            else:
                deduped_count += 1
            outcomes.append(IngestItemOutcome(id=UUID(data["id"]), created=created))

    logger.info(
        "ingest_batch_complete connector_id=%s workspace_id=%s hypotheses_from_connector=%s "
        "persisted=%s created=%s deduped=%s skipped_validation=%s",
        body.connector_id,
        body.workspace_id,
        n_raw,
        len(outcomes),
        created_count,
        deduped_count,
        len(skipped),
    )

    return IngestBatchResponse(hypotheses=outcomes, skipped_hypotheses=skipped)
