# THMP — Threat Hypothesis Management Platform

Open-source, self-hostable web application for SOC analysts and threat intelligence teams to manage the **lifecycle of threat hypotheses**: from intel ingestion through collaborative hunting, evidence, MITRE ATT&CK mapping, and reporting.

This README summarizes the product vision from the **THMP Full System Build Plan** (`THMP_Full_Build_Plan.docx` in the repository) and documents what is **implemented in this codebase today**.

## Vision (build plan)

- **Composable stack** — Services are independently deployable (Docker Compose for labs; Kubernetes/Helm envisioned for production).
- **Primary users** — SOC analysts (hypotheses, evidence, hunts); TI teams (structured intel, ATT&CK).
- **Core capabilities** (target architecture) — Full hypothesis workflow (draft → active → in-hunt → validated → closed/archived), ATT&CK mapping and Navigator-style coverage, evidence store, RBAC/workspaces, audit logging, pluggable **connector** integrations (SIEM, STIX/TAXII, SCM, scanners, etc.).

The build plan also describes additional components (e.g. dedicated search tier, GraphQL, Celery-heavy ingestion) as the platform matures.

## What is implemented here

| Area | Status |
|------|--------|
| **API gateway** | [Traefik](https://traefik.io/) v3 routes `/api/v1/...` to services |
| **Auth & users** | JWT, registration/login, workspaces, roles (`user-service`) |
| **Hypotheses, hunts, evidence, findings** | CRUD and FSM transitions (`hypothesis-service`, PostgreSQL) |
| **Audit** | Internal event ingestion + admin-visible event list (`audit-service`) |
| **ATT&CK catalogue** | STIX sync, techniques/tactics, Navigator layer JSON export (`attack-service`) |
| **Reporting (Phase 5)** | Templates, async report jobs (PDF + STIX), export history, schedules (`reporting-service`) |
| **Integrations (Phase 3)** | Per-workspace integration config (encrypted `secret_ref` when configured), **`thmp-cdk`**, first-party connectors under `connectors/`, **`ingestion-service`** (`POST /api/v1/ingest/batch` on port **8005** in Compose), internal dedupe, **Test connection** from Integrations UI |
| **Object storage & search** | MinIO/S3 evidence store; OpenSearch cross-entity **`/api/v1/search`** |
| **Auth** | JWT + optional **OIDC** (JIT provisioning) |
| **Frontend** | Single SPA: hypotheses, hunts, kanban, evidence hub, ingestion triage, ATT&CK navigator + suggest, integrations, global search |

**Stack in this repo:** Python 3.12, FastAPI, SQLAlchemy/asyncpg, PostgreSQL 16, Redis 7, Node 20.

Detailed setup, env vars, ingest URLs, and migrations: **[docs/development.md](docs/development.md)**.

Connector contract: **[connector-spec.md](connector-spec.md)**.

Architecture decisions: **[docs/adr/](docs/adr/)** (connector adapter pattern, ATT&CK service, ingestion auth/dedupe **0008**, single SPA **0009**, object storage + search **0010**, OIDC **0011**).

Security reporting: **[SECURITY.md](SECURITY.md)**.

## Quick start

```bash
cp .env.example .env
# Edit secrets in .env for anything beyond local dev defaults.

docker compose up --build

# Optional: ATT&CK suggest sidecar (heavy ML deps)
# docker compose --profile ml up -d attack-suggest-service
```

- **API (via Traefik):** `http://localhost` (port 80, `/api/v1/...` routes only)
- **UI:** `http://localhost:5173` (Vite dev server; proxies `/api` to Traefik)
- **Direct service docs (OpenAPI):** see [docs/development.md](docs/development.md) (ports 8001–8005)

If you open `http://localhost:80/` directly for SPA routes, Traefik returns 404 by design; use `http://localhost:5173`.

Smoke test against a running stack:

```bash
SMOKE_BASE_URL=http://127.0.0.1 python3 scripts/smoke_api.py
```

## Repository layout (high level)

| Path | Purpose |
|------|---------|
| `backend/thmp_common/` | Shared JWT and crypto helpers |
| `backend/thmp_cdk/` | Connector Development Kit (types, `ConnectorAdapter`, test helpers) |
| `backend/user_service/` | Auth, users, workspaces, **integrations** API |
| `backend/hypothesis_service/` | Hypotheses, hunts, evidence, findings; **internal ingest** |
| `backend/attack_service/` | ATT&CK STIX sync and catalogue APIs |
| `backend/reporting_service/` | Reporting templates, jobs, schedules; PDF/STIX exports |
| `backend/audit_service/` | Audit log |
| `backend/ingestion_service/` | Batch ingest (connectors → hypotheses) |
| `connectors/` | First-party connector packages (webhook, SIEM, TI, notifications, …) |
| `frontend/` | Web UI |
| `docs/` | Development guide, ADRs, architecture notes |

## Contributing

See **[docs/contributing.md](docs/contributing.md)** and **[SECURITY.md](SECURITY.md)** for vulnerability reporting.

## What’s next (Phase 5+)

- Harden connector OAuth device flows and vendor-specific webhook replay protection in production.
- Background workers (Celery/Redis) for ingestion back-pressure and search index repair.
- SOAR playbook templates and optional Kubernetes Helm charts.

## License

The THMP Full System Build Plan describes an **Apache 2.0** licensing intent. Add a `LICENSE` file at the repository root when you publish releases.

---

*Product direction and phased roadmap: internal **THMP Full System Build Plan** (`THMP_Full_Build_Plan.docx`).*
