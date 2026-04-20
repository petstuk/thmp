# 6. ATT&CK catalogue service (Phase 2)

Date: 2026-04-19

## Status

Accepted

## Context

Phase 1 stores `attack_technique_ids` on hypotheses as opaque UUIDs. Phase 2 requires a local MITRE ATT&CK catalogue: STIX ingestion, search APIs, Navigator export, and validation of hypothesis links without shared databases between services.

## Decision

- Add **`attack_service`**: FastAPI + PostgreSQL schema **`attack`** (tactics, techniques, technique–tactic links, sync metadata).
- **Ingest** the public MITRE Enterprise ATT&CK STIX 2.1 bundle from a configurable URL (default: [mitre/cti enterprise-attack.json](https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json)). Workspace **admins** trigger sync via `POST /api/v1/attack/sync`.
- **Internal validation**: `POST /api/v1/attack/internal/validate-technique-ids` with `X-Internal-Token: THMP_INTERNAL_API_SECRET`, called by **hypothesis-service** on create/patch when `ATTACK_SERVICE_URL` is set.
- **Navigator layer**: `GET /api/v1/attack/navigator-layer` uses the caller’s JWT + `X-Workspace-Id`, lists hypotheses via **hypothesis-service**, and maps stored technique UUIDs to **MITRE IDs** for a Navigator v4.5-style JSON payload.
- **Routing**: Traefik `PathPrefix(/api/v1/attack)` → `attack-service` (host dev port **8004** for `/docs`).

## Consequences

- Hypothesis writes fail with **422** if technique UUIDs are unknown (when validation is enabled).
- First-time setup requires an admin **sync** before pickers return data.
- Navigator export depends on **HYPOTHESIS_SERVICE_URL** from `attack-service` and correct inter-service networking.

## Addendum (Phase 2 polish)

- **`GET /api/v1/attack/status`** — Authenticated catalog summary (`catalog_ready`, tactic/technique counts, `last_sync_at`, `source_url_display`, `bundle_attack_version`) for operators and the UI empty-state.
- **`sync_meta.bundle_attack_version`** — Set during ingest from STIX `x-mitre-collection.x_mitre_version` when present; Navigator layer `versions.attack` prefers this value over a hard-coded default.
- **Search index** — `pg_trgm` GIN index on `attack.techniques.name` for `ILIKE` / typeahead at scale.
- **Validation** — Internal `validate-technique-ids` caps the `ids` list length (500); hypothesis-service returns structured `detail` for 502/422 when validation fails.
