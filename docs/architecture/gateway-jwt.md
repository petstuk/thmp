# API gateway and JWT (Phase 1)

## Traefik

Phase 1 uses **Traefik** as a reverse proxy only: TLS termination is optional locally; routing is by path prefix to the User, Hypothesis, and Audit services.

## JWT validation

**Decision:** Each service validates the `Authorization: Bearer <access_token>` header using the shared `THMP_JWT_SECRET`, `THMP_JWT_ISSUER`, and `THMP_JWT_AUDIENCE`.

Rationale: Traefik OSS does not ship a maintained JWT middleware suitable for all our rules without plugins; duplicating validation in FastAPI keeps behaviour explicit and testable. Revisit central validation if we adopt Kong plugins or Traefik Enterprise patterns later.

## Access token claims

Services expect (minimum):

- `sub` — user id (UUID string)
- `email` — user email
- `workspaces` — array of `{ "workspace_id": "<uuid>", "role": "<role_name>" }`

The User service issues this shape on login. Hypothesis and Audit services reject tokens missing workspace membership when the route requires a workspace.

## Internal service calls

Hypothesis → Audit ingestion uses header `X-Internal-Token: <THMP_INTERNAL_API_SECRET>` on the audit internal route. This is not user JWT auth.
