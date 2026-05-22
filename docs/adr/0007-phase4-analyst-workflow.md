# 7. Phase 4 — Analyst workflow (implementation notes)

## Status

Accepted — implemented in the hypothesis service and frontend (Phase 4 scope from the THMP Full System Build Plan §11).

## Scope

- **Hunt lifecycle:** `GET/PATCH/DELETE /api/v1/hunts/{id}`, timeline (`GET/POST .../timeline`), status FSM (`planned` → `active` → `completed`|`cancelled`).
- **Kanban:** `/board` UI, filters, saved presets (`/api/v1/kanban/presets`), drag-and-drop status transitions (same hypothesis FSM as API).
- **Evidence:** versioning via `previous_evidence_id`, SIEM fields, IOC extraction (`auto_extract_iocs`), file upload (`POST /api/v1/evidence/upload`) to `THMP_EVIDENCE_FILES_DIR` (Compose: `/data/evidence` volume).
- **Collaboration:** threaded comments (`/api/v1/hypotheses/{id}/comments`), `@uuid` mentions → `analyst_notifications` + `/api/v1/notifications`.
- **Scoring:** workspace weights in `hypothesis.workspace_scoring_settings`; composite `confidence_score` recomputed from analyst rating, evidence weights, and signal strength (`app/scoring.py`).
- **Activity:** `GET /api/v1/hypotheses/{id}/activity` aggregates status events, evidence, comments.
- **Concurrency:** optional `If-Match` (hypothesis `updated_at` ISO) on `PATCH /api/v1/hypotheses/{id}` → **409** with `detail.current` snapshot.
- **Hunt concurrency:** same `If-Match` semantics for `PATCH /api/v1/hunts/{id}` (hunt `updated_at`); **409** returns a `HuntOut` snapshot in `detail.current` for the client to refresh.
- **Evidence download:** `GET /api/v1/evidence/{id}/file` streams stored uploads after workspace and hypothesis access checks; UI links for file-typed evidence with a `storage_key`.
- **Mentions / delivery:** in-app `analyst_notifications` only; external webhook/Slack delivery remains deferred until Phase 3–style connector work is extended beyond ingest.

## Non-goals (later phases)

- PDF/STIX reporting (Phase 5), SAML/MFA/custom roles (Phase 6), dedicated search tier.

## Traefik

Additional path prefixes route to the hypothesis service: `/api/v1/workspace`, `/api/v1/kanban`, `/api/v1/notifications`.
