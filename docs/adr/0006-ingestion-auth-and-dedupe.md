# ADR 0006: Ingestion service authentication and hypothesis deduplication

## Status

Accepted (2026-04-19)

## Context

Phase 3 introduces an ingestion HTTP path that loads connector adapters via `thmp.connectors` entry points, normalises payloads, and creates **draft** hypotheses. The ingestion service must call the user service (integration config) and hypothesis service (persistence) without an end-user JWT.

## Decision

1. **Service-to-service authentication** — Ingestion, hypothesis internal routes, and user-service internal integration routes require header **`X-Internal-Token`** matching **`THMP_INTERNAL_API_SECRET`**, consistent with the audit internal event endpoint.
2. **No Traefik exposure for internal routes** — `/api/v1/internal/...` is reachable only on the Docker network (and published dev ports for debugging). The ingestion **`POST /api/v1/ingest/batch`** endpoint is exposed on host port **8005** in Compose for development and CI; production deployments should place it behind a private network or mTLS and must not reuse dev-only patterns on the public internet.
3. **Dedupe key** — Idempotency uses `source_ref.ingest.dedupe_key` (string), scoped by `workspace_id`. Before insert, the hypothesis service checks for an existing row with the same workspace and dedupe key; duplicates return the existing id with `created: false`.
4. **Ingest actor** — Hypotheses require `created_by` / `owner_id`. The value is resolved in order: request body `ingest_actor_user_id`, integration config `ingest_actor_user_id`, then optional env **`THMP_INGEST_DEFAULT_ACTOR_USER_ID`** on the ingestion service.
5. **Batch validation** — After `normalise()`, each hypothesis row is coerced with CDK `NormalisedHypothesis`. Rows that fail validation are **skipped** (not persisted); the HTTP response includes `skipped_hypotheses` with `reason` and optional `detail`. Valid rows are still applied. Empty batches return `hypotheses: []` and no error.

## Consequences

- Operators must rotate `THMP_INTERNAL_API_SECRET` like other shared secrets.
- Connectors must supply stable `dedupe_key` values per workspace (e.g. vendor id + connector id).
- Webhook signature validation (per vendor) remains the connector’s responsibility at the edge; this ADR does not replace HMAC or mTLS for public webhook URLs.
