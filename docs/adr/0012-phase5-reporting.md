# 12. Phase 5 reporting service

Date: 2026-05-21

## Status

Accepted

## Context

Phase 5 requires first-class reporting: PDF templates, STIX export, coverage reporting, export history, and scheduled digests.  
Until now, `/reporting` in the frontend has been a placeholder and exports were limited to ATT&CK Navigator JSON.

## Decision

- Introduce a dedicated `reporting-service` (FastAPI + PostgreSQL schema `reporting`), consistent with service boundaries in ADR 0002.
- Add three core entities:
  - `report_templates`
  - `report_jobs`
  - `report_schedules`
- Generate report artefacts asynchronously through Celery (`reporting-worker`) with Redis as broker.
- Persist generated PDF and STIX artefacts in MinIO (`S3_BUCKET_REPORTS`).
- Expose Reporting APIs under `/api/v1/reports`:
  - template CRUD
  - report job create/list/detail/download/preview
  - schedule CRUD and run-now
- Emit audit records for report export/schedule events through `audit-service` internal endpoint.

## Consequences

- Reporting becomes independently deployable and can evolve without coupling to hunt/hypothesis write paths.
- Exports are durable and auditable with explicit history rows (`report_jobs`) and object storage keys.
- Scheduled digests now run in-process via Celery beat polling `report_schedules`.
- The initial PDF generator is intentionally lightweight for local/dev iteration; a richer renderer can be swapped later without changing API contracts.

## Non-goals

- Phase 6 enterprise identity controls (SAML/MFA/custom RBAC).
- Phase 7 launch hardening work (pen-test/load-test/release pipeline).
- SOAR playbook generation (tracked separately from core reporting APIs).
