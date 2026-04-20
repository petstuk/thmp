# Local development

## Prerequisites

- Docker and Docker Compose v2
- Python 3.12+ and Node 20+ for local tooling (Ruff, Pytest, Vite)

### Backend venv (optional, for lint/tests without Docker)

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e thmp_common -e thmp_cdk -e user_service -e audit_service -e hypothesis_service -e attack_service -e ingestion_service pytest ruff
pip install -e ../connectors/example_webhook
cd hypothesis_service && pytest -q
```

## Quick start

```bash
cp .env.example .env
# edit secrets in .env if not using defaults for local dev

docker compose up --build
```

- Traefik listens on **http://localhost** (port 80).
- Frontend dev server: **http://localhost:5173**. With the default setup, **`VITE_API_BASE_URL` is empty**: the browser calls **`/api/...` on port 5173** and Vite **proxies** to Traefik (`DEV_PROXY_TARGET`, `http://traefik:80` inside Compose). That avoids “Failed to fetch” when port 80 is blocked or flaky from the browser.
- If you open the UI via another hostname (for example `http://192.168.x.x:5173`), set `THMP_CORS_ORIGINS` to include that exact origin, or use the same host you configured for the UI.
- Frontend stack (Vite, shadcn/ui, light/dark theming): [frontend-ui.md](frontend-ui.md). Routes and API mapping: [frontend-routes.md](frontend-routes.md).

### Service routes (via Traefik)

| Path prefix | Service |
|-------------|---------|
| `/api/v1/auth`, `/api/v1/users`, `/api/v1/workspaces`, `/api/v1/integrations` | User |
| `/api/v1/hypotheses`, `/api/v1/hunts`, `/api/v1/evidence`, `/api/v1/findings` | Hypothesis |
| `/api/v1/audit` | Audit |
| `/api/v1/attack` | ATT&CK catalogue (techniques, tactics, sync, Navigator layer) |

Send header **`X-Workspace-Id`** on Hypothesis and ATT&CK read routes after login (use the workspace id returned from registration or `/api/v1/workspaces`).

**ATT&CK data** — The catalogue is empty until a workspace **admin** runs a sync (downloads the MITRE Enterprise STIX bundle). Example:

```bash
curl -sS -X POST http://127.0.0.1/api/v1/attack/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-Id: $WORKSPACE_ID"
```

Default bundle URL: see `ATTACK_STIX_URL` in [.env.example](../.env.example). Override for air-gapped or pinned mirrors.

JWT validation is performed **in each service** (Traefik routes only). See [gateway-jwt.md](architecture/gateway-jwt.md).

### Integrations and ingestion (Phase 3)

- **Integration config** — Workspace **admin** or **manager** can manage rows under **`GET/POST /api/v1/integrations`** (requires `X-Workspace-Id`). Non-secret JSON lives in `config`; use `ingest_actor_user_id` (UUID string) so ingested hypotheses have a valid `created_by`. API responses mask **`secret_ref`** as `***` when set (operators still PATCH new values).
- **Ingestion service** — Not routed through Traefik by default. With Compose, call **`http://127.0.0.1:8005/api/v1/ingest/batch`** with header **`X-Internal-Token: $THMP_INTERNAL_API_SECRET`** and JSON body `workspace_id`, `connector_id`, `raw_payload` (see [connectors/example_webhook/README.md](../connectors/example_webhook/README.md)).
- **Dedupe and internal auth** — See [ADR 0006: Ingestion auth and dedupe](adr/0006-ingestion-auth-and-dedupe.md).
- **Triage queries** — `triage_queue=true` returns **draft** hypotheses with any **non-`manual`** `source_type` (e.g. `intel_feed`, `integration`). **`integration_queue=true`** returns only **draft** hypotheses with `source_type=integration` (connector ingest). The Ingestion UI uses `integration_queue=true`.

### OpenAPI (Swagger) — direct to services

Traefik only routes `/api/v1/...`, so Swagger is not on port 80. For local dev, each API container publishes a host port:

| Service | Swagger UI | OpenAPI JSON |
|---------|------------|--------------|
| User | http://localhost:8001/docs | http://localhost:8001/openapi.json |
| Hypothesis | http://localhost:8002/docs | http://localhost:8002/openapi.json |
| Audit | http://localhost:8003/docs | http://localhost:8003/openapi.json |
| ATT&CK | http://localhost:8004/docs | http://localhost:8004/openapi.json |
| Ingestion | http://localhost:8005/docs | http://localhost:8005/openapi.json |

## Migrations

Service images run **`alembic upgrade head` on container start** (see each `Dockerfile` `CMD`). You normally **do not** need manual upgrades after `docker compose up`.

Run migrations by hand only when debugging (e.g. after editing migration files without recreating the container):

```bash
docker compose exec user-service alembic upgrade head
docker compose exec hypothesis-service alembic upgrade head
docker compose exec audit-service alembic upgrade head
docker compose exec attack-service alembic upgrade head
```

Or from the host (with `DATABASE_URL` / `ALEMBIC_SYNC_URL` pointing at Postgres and deps installed):

```bash
cd backend/user_service && alembic upgrade head
```

## Troubleshooting

- **`405 Method Not Allowed` on `/api/v1/auth/register` in the browser** — Registration is **POST-only**. A browser address bar issues **GET**, so FastAPI returns 405; that usually means the request **reached** user-service (often via Traefik on port 80). Use `curl -X POST`, the UI, or `scripts/smoke_api.py`.

- **`404 page not found` (plain text) on `http://127.0.0.1/api/v1/...`** — Traefik’s response when **no router** matches entrypoint `web` (host port 80). Not the same as 405 above. After editing Traefik labels in `docker-compose.yml`, recreate: `docker compose down && docker compose up -d` (add `--build` if images changed).

- **Confirm port 80 is Traefik** — Another process (or an old container) on host port 80 causes wrong or empty routes. On macOS, check what listens: `lsof -nP -iTCP:80 -sTCP:LISTEN`.

- **Compare POST through Traefik vs direct user-service** (same JSON body):

  ```bash
  curl -sS -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"probe@example.com","password":"probepass12","display_name":"Probe"}'
  curl -sS -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8001/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"probe2@example.com","password":"probepass12","display_name":"Probe"}'
  ```

  Expect **201** (or **409** if the email exists) with JSON from the app. If **:8001** works but **:80** returns plain **404 page not found**, fix Traefik routing (see dashboard below), not the app.

- **Traefik dashboard (local dev only)** — With `--api.insecure=true` in Compose, open **http://127.0.0.1:8080/dashboard/** and under **HTTP → Routers** confirm routers such as **`thmp-user-auth`** (rule `PathPrefix(/api/v1/auth)`) and service **`thmp-user-svc`**. If the dashboard does not load, check `docker compose logs traefik`.

### ATT&CK catalogue (Phase 2)

- **`GET /api/v1/attack/status`** — Returns `catalog_ready`, counts, `last_sync_at`, and `bundle_attack_version` (after sync). Use it to confirm the DB has MITRE data without opening Postgres.
- **Sync timeout / MITRE URL blocked** — `POST /api/v1/attack/sync` downloads the full Enterprise JSON (large). Air-gapped or filtered networks may block `ATTACK_STIX_URL`. Host a bundle internally and point **`ATTACK_STIX_URL`** at it, or run sync from a machine with egress. Check `docker compose logs attack-service`.
- **`422` / unknown `attack_technique_ids`** — Hypothesis validation calls **attack-service**; IDs must exist in the local catalogue. After restoring an old DB dump or skipping sync, run an admin sync or remove stale technique UUIDs from hypotheses.
- **Navigator layer has empty `techniques`** — Normal if no hypotheses link ATT&CK techniques. The `versions.attack` field comes from the last successful sync (`x_mitre_version` in the STIX collection); if missing, the export uses `"unknown"`. Override the Navigator app version string with **`THMP_NAVIGATOR_APP_VERSION`** if needed.
- **Technique search slow** — Postgres **`pg_trgm`** index on `attack.techniques.name` is created by migration `a002`; ensure migrations have run (`docker compose exec attack-service alembic current`).

## API smoke test

With the stack up and Traefik on port 80:

```bash
SMOKE_BASE_URL=http://127.0.0.1 python3 scripts/smoke_api.py
```

## CI

GitHub Actions runs Ruff, backend unit tests, frontend build, and a Compose-based smoke test on pull requests. See [contributing.md](contributing.md).
