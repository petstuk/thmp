# Example webhook connector

Reference implementation for the [connector-spec.md](../../connector-spec.md). Maps a small JSON payload to one `draft` hypothesis via the THMP ingestion service.

## Payload shape

```json
{
  "title": "Suspicious login",
  "body": "Optional narrative",
  "external_id": "vendor-event-123"
}
```

`external_id` (or `id`) is required for idempotent dedupe.

## Integration config (non-secret JSON)

| Key | Description |
|-----|-------------|
| `ingest_actor_user_id` | UUID string; hypotheses are created as this user (`created_by` / `owner_id`). Required unless `THMP_INGEST_DEFAULT_ACTOR_USER_ID` is set on the ingestion service. |
| `title_prefix` | Optional string prepended to the hypothesis title. |

## Entry point

Registered as `example_webhook` under group `thmp.connectors`.

## Local tests

From the repo root:

```bash
pip install -e backend/thmp_cdk -e connectors/example_webhook pytest
pytest -q connectors/example_webhook/tests
```
