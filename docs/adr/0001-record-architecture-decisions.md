# 1. Record architecture decisions

Date: 2026-04-19

## Status

Accepted

## Context

THMP is a multi-service platform with long-lived APIs, integrations, and operational constraints. Ad-hoc decisions in chat or tickets are easy to lose and hard to onboard.

## Decision

We record significant technical decisions as Architecture Decision Records (ADRs) in `docs/adr/`, numbered sequentially, using this structure:

- **Title** — Short noun phrase
- **Status** — Proposed | Accepted | Superseded by ADR-NN
- **Context** — Forces and constraints
- **Decision** — What we chose
- **Consequences** — Trade-offs and follow-up work

Minor implementation details belong in code comments or PR descriptions, not ADRs.

## Consequences

- Contributors MUST add or update an ADR when changing a decision already captured, or when introducing a new cross-cutting pattern (security, tenancy, data model).
- Superseded ADRs are kept for history; the new ADR links back.
