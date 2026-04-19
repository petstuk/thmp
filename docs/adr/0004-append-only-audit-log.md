# 4. Append-only audit log

Date: 2026-04-19

## Status

Accepted

## Context

Regulators, customers, and incident reviewers require a tamper-evident record of security-relevant changes. Application bugs or compromised credentials must not allow silent rewriting of history.

## Decision

- **Model:** Append-only audit records capturing actor, time, entity, action, and JSON diff (see [data-model.md](../architecture/data-model.md#audit-log)).
- **Transport:** Audit events are emitted asynchronously so request latency stays predictable; loss MUST be monitored (queue depth, dead-letter handling).
- **Storage:** Prefer a separate database or tablespace managed only by the audit pipeline; application roles used by business logic have **no UPDATE/DELETE** on audit tables.
- **Query:** Admins query via dedicated API and UI; exports in JSON and CSV as per product requirements.

## Consequences

- Schema migrations for audit storage must never rewrite historical rows; corrections use compensating entries if ever required.
- PII is minimised in audit payloads; user identifiers are UUIDs, not emails, in diffs where possible.
