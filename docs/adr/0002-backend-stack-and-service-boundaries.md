# 2. Backend stack and service boundaries

Date: 2026-04-19

## Status

Accepted

## Context

THMP must be approachable for security-community contributors, support async I/O for integrations, and scale core domains independently. The full build plan defines five domain services (Hypothesis, Hunt, Evidence, ATT&CK, Reporting) plus an API gateway, with no shared databases between services.

## Decision

- **Language/runtime:** Python 3.12 for all backend services.
- **HTTP framework:** FastAPI for versioned REST APIs and automatic OpenAPI generation.
- **Persistence:** PostgreSQL 16 per service schema or database (no cross-service FKs at the DB layer; use APIs).
- **Async work:** Celery with Redis for ingestion and long-running jobs.
- **Gateway:** Kong OSS or Traefik as operator choice; JWT validation and RBAC enforcement at the edge with service-level checks.
- **Inter-service communication:** REST/JSON contracts; optional Redis Streams for high-volume ingestion events.

## Consequences

- Each service owns migrations (Alembic) and release cadence compatible with backward-compatible API rules.
- Duplication of read models (e.g. reporting) is acceptable via explicit sync or read APIs rather than shared tables.
- Contributors must respect published OpenAPI as the contract; breaking changes require version bumps and ADR updates.
