# ADR 0009: Single SPA with workspace role gating

## Status

Accepted (2026-04-23)

## Context

THMP ships one React SPA (Vite) for analysts, hunt leads, and administrators. Workspace membership determines which routes and actions are available.

## Decision

1. **One bundle** — Analyst workflows (hypotheses, hunts, evidence, kanban), ATT&CK navigator, and admin surfaces (integrations, identity providers) live in the same app.
2. **Role gating in UI** — Navigation and destructive actions are hidden or disabled based on `X-Workspace-Id` membership role from the JWT/workspace list.
3. **API enforcement** — All restrictions are re-validated in FastAPI dependencies; the UI gating is usability only.

## Consequences

- Simpler deployment (one static asset pipeline).
- Admin-only pages must not assume obscurity; server-side checks remain mandatory.
