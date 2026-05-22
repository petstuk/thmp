# Frontend routes and API mapping

Protected routes require a logged-in user and `X-Workspace-Id` (from workspace selector in [`AppShell`](../frontend/src/components/AppShell.tsx)) for hypothesis-service calls.

| Route | Page | Primary APIs |
|-------|------|--------------|
| `/` | Overview — workspace stats and shortcuts | `GET /api/v1/hypotheses`, `GET /api/v1/hunts`, `GET /api/v1/hunts/findings` |
| `/hypotheses` | Hypothesis list and create | `GET`/`POST /api/v1/hypotheses` |
| `/hypotheses/:id` | Hypothesis detail — activity, comments (`@uuid` → inbox), evidence + upload + download, scoring weights (manager), `If-Match` on save | `GET`/`PATCH`/`DELETE /api/v1/hypotheses/{id}`; `GET` `/hypotheses/{id}/activity`; `GET`/`POST` `/hypotheses/{id}/comments` + `PATCH …/comments/{cid}`; `GET`/`POST /api/v1/evidence`, `POST /evidence/upload`, `GET /evidence/{id}/file`; `GET`/`PATCH /api/v1/workspace/scoring`; ATT&CK |
| `/board` | Hunt board (Kanban) — filters, saved presets, drag status | `GET /api/v1/hypotheses` (query params); `GET`/`POST`/`DELETE /api/v1/kanban/presets` |
| `/ingestion` | Ingestion queue — connector drafts | `GET /api/v1/hypotheses?integration_queue=true` (draft + `source_type=integration`) |
| `/integrations` | Integration config (admin/manager) | `GET`/`POST`/`PATCH /api/v1/integrations` |
| `/hunts` | Hunt list and **create** | `GET`/`POST /api/v1/hunts` |
| `/hunts/:id` | Hunt detail — timeline, status; optional **`If-Match`** on save | `GET`/`PATCH`/`DELETE /api/v1/hunts/{id}`; `GET`/`POST …/timeline` |
| `/evidence` | Evidence hub — per-hypothesis evidence counts (links to detail) | `GET /api/v1/hypotheses`; `GET /api/v1/evidence?hypothesis_id=` |
| `/findings` | Finding list | `GET /api/v1/hunts/findings` |
| `/notifications` | Inbox (mentions, etc.) | `GET /api/v1/notifications`; `POST …/{id}/read` |
| `/reporting` | Reporting workspace — templates, job runs, export history, schedules | `GET`/`POST /api/v1/reports/templates`; `GET`/`POST /api/v1/reports/jobs`; `GET /api/v1/reports/jobs/{id}/download?format=pdf|stix`; `GET`/`POST /api/v1/reports/schedules` + `POST …/{id}/run` |

**Hypothesis service API prefixes (all via Traefik on port 80 in Compose):** in addition to `/api/v1/hypotheses`, `/hunts`, `/evidence`, the gateway routes `/api/v1/workspace`, `/api/v1/kanban`, `/api/v1/notifications` to the same service.

Auth: `/login`, `/register` (user-service).

Adjust this table when new services or aggregates are added.
