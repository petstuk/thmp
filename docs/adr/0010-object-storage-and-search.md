# ADR 0010: Object storage (S3/MinIO) and OpenSearch

## Status

Accepted (2026-04-23)

## Context

Evidence files and cross-entity search require durable blob storage and a search tier. The stack targets self-hosted operators (Compose) and cloud deployments.

## Decision

1. **Evidence blobs** — Stored in **S3-compatible** object storage (`aioboto3` / `boto3`), with **MinIO** in Compose. Env: `S3_ENDPOINT_URL`, `S3_BUCKET_EVIDENCE`, credentials, optional local disk fallback for tests.
2. **Full-text search** — **OpenSearch** (Apache 2.0) single-node in development; `OPENSEARCH_URL` enables async indexing of hypotheses, evidence, and findings. If unset, indexing is skipped and list APIs still work.
3. **Indexing** — Fire-and-forget tasks after writes; no strict delivery guarantee in Phase 1–4 (acceptable for search freshness).

## Consequences

- Operators must secure MinIO/S3 credentials and OpenSearch network paths.
- Search results may lag slightly behind relational data.
