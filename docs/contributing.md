# Contributing

## Workflow

- Open a PR against the default branch; keep changes focused and match existing style in touched files.
- CI runs Ruff, backend tests, frontend typecheck/build, and a Docker **API smoke** job on pull requests.
- **Branch protection** (required checks, review rules) is configured in **GitHub repository settings**, not in this repo.

## Local checks

```bash
cd backend && source .venv/bin/activate  # after creating venv per docs/development.md
ruff check thmp_common user_service/app audit_service/app hypothesis_service/app
cd hypothesis_service && pytest -q
cd ../../frontend && npx tsc -b --noEmit
# optional full bundle (requires working Vite toolchain): npm run build
```

With Docker running:

```bash
SMOKE_BASE_URL=http://127.0.0.1 python3 scripts/smoke_api.py
```

## Security

- Do not commit secrets; use `.env` locally (see `.env.example`).
- Report vulnerabilities per [SECURITY.md](../SECURITY.md).
