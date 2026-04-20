# Frontend routes and API mapping

Protected routes require a logged-in user and `X-Workspace-Id` (from workspace selector in [`AppShell`](../frontend/src/components/AppShell.tsx)) for hypothesis-service calls.

| Route | Page | Primary APIs |
|-------|------|----------------|
| `/` | Overview — workspace stats and shortcuts | `GET /api/v1/hypotheses`, `GET /api/v1/hunts`, `GET /api/v1/hunts/findings` |
| `/hypotheses` | Hypothesis list and create | `GET`/`POST /api/v1/hypotheses` |
| `/hypotheses/:id` | Hypothesis detail | `GET`/`PATCH`/`DELETE /api/v1/hypotheses/{id}`, ATT&CK techniques |
| `/ingestion` | Ingestion queue — connector drafts | `GET /api/v1/hypotheses?integration_queue=true` (draft + `source_type=integration`) |
| `/integrations` | Integration config (admin/manager) | `GET`/`POST`/`PATCH /api/v1/integrations` |
| `/hunts` | Hunt list | `GET /api/v1/hunts` |
| `/evidence` | Hub — hypothesis links (evidence is per hypothesis) | `GET /api/v1/hypotheses`; evidence: `GET /api/v1/evidence?hypothesis_id=` on detail |
| `/findings` | Finding list | `GET /api/v1/hunts/findings` |
| `/reporting` | Placeholder until Reporting service ships | Navigator export via header (`GET /api/v1/attack/navigator-layer`) |

Auth: `/login`, `/register` (user-service).

Adjust this table when new services or aggregates are added.
