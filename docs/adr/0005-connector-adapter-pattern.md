# 5. Connector adapter pattern

Date: 2026-04-19

## Status

Accepted

## Context

Dozens of external systems (SIEM, TAXII, SCM, ITSM) must integrate without forking core THMP. Contributors need a stable extension point.

## Decision

- **Specification:** [connector-spec.md](../../connector-spec.md) version 1.0.0 defines the `ConnectorAdapter.normalise()` contract and packaging rules.
- **Execution:** Connectors run as separate Python packages (pull workers or webhook handlers) invoked by the platform ingestion layer.
- **Normalisation:** All external payloads map to the core Hypothesis, Evidence, and IOC shapes in the data model; vendors MUST NOT leak proprietary field names into persisted core columns except via `metadata` / `source_ref` JSONB.
- **CDK:** A future `thmp-cdk` package provides base classes, fixtures, and a mock platform for offline testing.

## Consequences

- New integrations ship as connectors first; changes to core entities require data-model ADR + spec bump if `normalise()` output shape changes.
- Security review focuses on credential handling, SSRF from pull connectors, and webhook authenticity.
