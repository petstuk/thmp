# Database layout (Phase 1)

Single PostgreSQL database (`thmp`) with **separate PostgreSQL schemas** per service boundary:

| Schema | Owner service | Notes |
|--------|---------------|-------|
| `auth` | User | users, workspaces, roles, workspace_memberships, refresh_tokens |
| `hypothesis` | Hypothesis | hypotheses, hunts, evidence, findings, status_events |
| `audit` | Audit | audit_log (append-only) |

This preserves logical service ownership and separate Alembic histories without running three database servers in development. Cross-schema foreign keys are avoided: `user_id` and `workspace_id` are UUIDs without FK to `auth` from `hypothesis`.
