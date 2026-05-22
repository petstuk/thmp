from __future__ import annotations

import os
from datetime import datetime, timezone
from io import BytesIO
from uuid import UUID

import boto3
from botocore.client import BaseClient
from botocore.exceptions import BotoCoreError, ClientError


def _bucket_name() -> str:
    return os.environ.get("S3_BUCKET_REPORTS", "thmp-reports")


def _client() -> BaseClient:
    endpoint = os.environ.get("S3_ENDPOINT_URL", "http://minio:9000")
    access_key = os.environ.get("S3_ACCESS_KEY", "thmp-minio")
    secret_key = os.environ.get("S3_SECRET_KEY", "thmp-minio-secret")
    region = os.environ.get("S3_REGION", "us-east-1")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
    )


def ensure_bucket_sync() -> None:
    bucket = _bucket_name()
    s3 = _client()
    try:
        s3.head_bucket(Bucket=bucket)
        return
    except ClientError:
        pass
    s3.create_bucket(Bucket=bucket)


def put_artifact(workspace_id: UUID, job_id: UUID, suffix: str, body: bytes, content_type: str) -> str:
    now = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    key = f"workspaces/{workspace_id}/reports/{now}-{job_id}.{suffix}"
    s3 = _client()
    bio = BytesIO(body)
    s3.upload_fileobj(
        bio,
        _bucket_name(),
        key,
        ExtraArgs={"ContentType": content_type},
    )
    return key


def get_artifact_bytes(key: str) -> bytes:
    s3 = _client()
    bio = BytesIO()
    try:
        s3.download_fileobj(_bucket_name(), key, bio)
    except (BotoCoreError, ClientError) as exc:
        raise FileNotFoundError(key) from exc
    return bio.getvalue()
