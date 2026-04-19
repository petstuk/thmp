# Local development

## Prerequisites

- Docker and Docker Compose v2
- Python 3.12+ and Node 20+ for local tooling (Ruff, Pytest, Vite)

### Backend venv (optional, for lint/tests without Docker)

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e thmp_common -e user_service -e audit_service -e hypothesis_service pytest ruff
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

### Service routes (via Traefik)

| Path prefix | Service |
|-------------|---------|
| `/api/v1/auth`, `/api/v1/users`, `/api/v1/workspaces` | User |
| `/api/v1/hypotheses`, `/api/v1/hunts`, `/api/v1/evidence`, `/api/v1/findings` | Hypothesis |
| `/api/v1/audit` | Audit |

Send header **`X-Workspace-Id`** on Hypothesis routes after login (use the workspace id returned from registration or `/api/v1/workspaces`).

JWT validation is performed **in each service** (Traefik routes only). See [gateway-jwt.md](architecture/gateway-jwt.md).

### OpenAPI (Swagger) — direct to services

Traefik only routes `/api/v1/...`, so Swagger is not on port 80. For local dev, each API container publishes a host port:

| Service | Swagger UI | OpenAPI JSON |
|---------|------------|--------------|
| User | http://localhost:8001/docs | http://localhost:8001/openapi.json |
| Hypothesis | http://localhost:8002/docs | http://localhost:8002/openapi.json |
| Audit | http://localhost:8003/docs | http://localhost:8003/openapi.json |

## Migrations

Service images run **`alembic upgrade head` on container start** (see each `Dockerfile` `CMD`). You normally **do not** need manual upgrades after `docker compose up`.

Run migrations by hand only when debugging (e.g. after editing migration files without recreating the container):

```bash
docker compose exec user-service alembic upgrade head
docker compose exec hypothesis-service alembic upgrade head
docker compose exec audit-service alembic upgrade head
```

Or from the host (with `DATABASE_URL` / `ALEMBIC_SYNC_URL` pointing at Postgres and deps installed):

```bash
cd backend/user_service && alembic upgrade head
```

## API smoke test

With the stack up and Traefik on port 80:

```bash
SMOKE_BASE_URL=http://127.0.0.1 python3 scripts/smoke_api.py
```

## CI

GitHub Actions runs Ruff, backend unit tests, frontend build, and a Compose-based smoke test on pull requests. See [contributing.md](contributing.md).
