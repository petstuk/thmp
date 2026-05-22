"""Evidence file storage — S3-compatible (MinIO in Compose) with local-directory fallback.

Behaviour selection:
- If S3_ENDPOINT_URL (or AWS default resolution) is set, use S3.
- Otherwise fall back to a local directory (dev / pytest only).
"""
from __future__ import annotations

import asyncio
import mimetypes
import os
import re
import uuid
from pathlib import Path
from typing import IO
from uuid import UUID

import boto3
from botocore.exceptions import ClientError

_SAFE = re.compile(r"[^a-zA-Z0-9._-]+")

# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _use_s3() -> bool:
    return bool(os.environ.get("S3_ENDPOINT_URL") or os.environ.get("AWS_DEFAULT_REGION"))


def _bucket() -> str:
    return os.environ.get("S3_BUCKET_EVIDENCE", "thmp-evidence")


def _s3_client():  # type: ignore[return]
    kwargs: dict = {}
    endpoint = os.environ.get("S3_ENDPOINT_URL")
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    access_key = os.environ.get("S3_ACCESS_KEY")
    secret_key = os.environ.get("S3_SECRET_KEY")
    if access_key and secret_key:
        kwargs["aws_access_key_id"] = access_key
        kwargs["aws_secret_access_key"] = secret_key
    region = os.environ.get("S3_REGION", "us-east-1")
    return boto3.client("s3", region_name=region, **kwargs)


def _local_base() -> Path:
    return Path(os.environ.get("THMP_EVIDENCE_FILES_DIR", "/tmp/thmp_evidence")).resolve()


def _build_key(workspace_id: UUID, original_name: str) -> str:
    safe = _SAFE.sub("_", Path(original_name).name)[:180] or "upload"
    return f"{workspace_id}/{uuid.uuid4().hex}_{safe}"


def _guess_mime(name: str, content_type: str | None) -> str | None:
    if content_type:
        return content_type
    guessed, _ = mimetypes.guess_type(name)
    return guessed


# ---------------------------------------------------------------------------
# Ensure bucket exists at startup
# ---------------------------------------------------------------------------

def ensure_bucket_sync() -> None:
    """Create the evidence bucket if it doesn't exist (idempotent). Call once at startup."""
    if not _use_s3():
        return
    client = _s3_client()
    bucket = _bucket()
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code in ("404", "NoSuchBucket"):
            try:
                region = os.environ.get("S3_REGION", "us-east-1")
                if region == "us-east-1":
                    client.create_bucket(Bucket=bucket)
                else:
                    client.create_bucket(
                        Bucket=bucket,
                        CreateBucketConfiguration={"LocationConstraint": region},
                    )
            except ClientError:
                pass  # concurrent creation race is fine
        # other errors (e.g. 403 Forbidden on existing bucket) — ignore at startup


# ---------------------------------------------------------------------------
# Public API (async, but boto3 calls are thread-pool dispatched)
# ---------------------------------------------------------------------------

async def save_uploaded_file(
    workspace_id: UUID,
    original_name: str,
    data: bytes,
    content_type: str | None = None,
) -> tuple[str, str | None]:
    """Persist uploaded bytes. Returns (storage_key, mime_type)."""
    key = _build_key(workspace_id, original_name)
    mime = _guess_mime(original_name, content_type)
    if _use_s3():
        await asyncio.to_thread(_s3_put, key, data, mime)
    else:
        await asyncio.to_thread(_local_put, key, data)
    return key, mime


def _s3_put(key: str, data: bytes, mime: str | None) -> None:
    client = _s3_client()
    extra: dict = {}
    if mime:
        extra["ContentType"] = mime
    client.put_object(Bucket=_bucket(), Key=key, Body=data, **extra)


def _local_put(key: str, data: bytes) -> None:
    base = _local_base()
    path = (base / key).resolve()
    try:
        path.relative_to(base)
    except ValueError as exc:
        raise ValueError("Invalid storage key") from exc
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


async def get_file_stream(storage_key: str) -> tuple[IO[bytes], str | None, int | None]:
    """Return a file-like object, mime_type, and size for the given storage key.

    Caller must close the stream.
    """
    if _use_s3():
        return await asyncio.to_thread(_s3_get_stream, storage_key)
    path = _local_path_for_key(storage_key)
    if not path.is_file():
        raise FileNotFoundError(storage_key)
    size = path.stat().st_size
    mime, _ = mimetypes.guess_type(str(path))
    return open(path, "rb"), mime, size  # noqa: WPS515


def _s3_get_stream(key: str) -> tuple[IO[bytes], str | None, int | None]:
    client = _s3_client()
    resp = client.get_object(Bucket=_bucket(), Key=key)
    body = resp["Body"]
    mime = resp.get("ContentType")
    size = resp.get("ContentLength")
    return body, mime, size


def _local_path_for_key(storage_key: str) -> Path:
    base = _local_base()
    p = (base / storage_key).resolve()
    try:
        p.relative_to(base)
    except ValueError as exc:
        raise ValueError("Invalid storage key") from exc
    return p


# ---------------------------------------------------------------------------
# Legacy sync helper kept for tests that import it directly
# ---------------------------------------------------------------------------

def file_path_for_storage_key(storage_key: str) -> Path:
    """Only valid in local-filesystem mode (tests). Raises if S3 is active."""
    if _use_s3():
        raise RuntimeError("file_path_for_storage_key is not available in S3 mode")
    return _local_path_for_key(storage_key)
