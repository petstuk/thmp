# THMP Connector Specification

**Version:** 1.0.0  
**Status:** Normative for first-party connectors and third-party contributions.

This specification defines how external systems integrate with the Threat Hypothesis Management Platform (THMP) via **connector adapters**. Each connector is a Python package that implements the interfaces below and transforms external data into THMP’s normalised schemas.

## Goals

- Allow connectors to ship **without modifying core platform code**.
- Provide a **single `normalise()` contract** per inbound payload type.
- Keep connectors **stateless** at the adapter boundary; persistence and auth are platform concerns.

## Terms

- **Adapter** — Runnable component (sidecar or worker) that pulls or receives webhooks from an external system.
- **Ingestion event** — One logical unit of work delivered to THMP (e.g. a SIEM notable, STIX bundle fragment, SCM finding).
- **Workspace** — Multi-tenancy boundary; all created entities MUST include `workspace_id` supplied by platform configuration.

## Package layout

```
connectors/<connector_name>/
  pyproject.toml          # declares entry points
  <connector_name>/
    __init__.py
    adapter.py          # implements ConnectorAdapter
    schemas.py          # Pydantic models for external + internal shapes
```

## Entry point

Register an entry point in `pyproject.toml`:

```toml
[project.entry-points."thmp.connectors"]
acme_siem = "acme_siem.adapter:AcmeSiemAdapter"
```

The callable MUST return a subclass of `ConnectorAdapter` (see below). The platform discovers connectors by this entry-point group.

## Core interface

Connectors SHOULD depend on the published **Connector Development Kit (CDK)** package (`thmp-cdk`, import `thmp_cdk`) for base types and validation helpers.

```python
from thmp_cdk import ConnectorAdapter, NormalisedBatch, NormalisedHypothesis
```

`NormalisedBatch` carries `hypotheses` as structured models (plus optional `evidence` / `iocs` as `dict` lists for future platform fields). The platform serialises hypothesis entries to JSON-compatible dicts when persisting.

### `ConnectorAdapter`

The CDK defines `ConnectorAdapter` and `NormalisedBatch` in code; the normative contract is:

```python
from typing import Any
from uuid import UUID

from thmp_cdk import ConnectorAdapter, NormalisedBatch

# Subclass ConnectorAdapter; implement normalise() -> NormalisedBatch
class ExampleAdapter(ConnectorAdapter):
    connector_id = "example"
    version = "0.1.0"

    def normalise(
        self,
        raw_payload: bytes | dict[str, Any],
        *,
        workspace_id: UUID,
        integration_config: dict[str, Any],
    ) -> NormalisedBatch:
        """Map external payload to THMP internal Hypothesis / Evidence / IOC shapes.

        raw_payload: body from webhook or API poll (pre-parsed JSON dict if applicable).
        integration_config: non-secret JSON from Integration Config (see data model doc).
        MUST NOT raise for benign bad records; log and skip or return empty batch.
        """
        ...
```

### `normalise()` rules

1. **Output shapes** MUST match the field names and enum values in [docs/architecture/data-model.md](docs/architecture/data-model.md) for `Hypothesis`, `Evidence`, and IOC JSONB items (`ip`, `domain`, `hash`, `url`, `email`).
2. **IDs**: Do not invent primary keys. Omit `id` on create; the platform assigns UUIDs. Optional `external_id` MAY be placed under `metadata` or `source_ref` for idempotency.
3. **`source_type`** on Hypothesis MUST be one of: `manual`, `intel_feed`, `scm`, `siem`, `vuln_scanner`, `integration` (generic connector-driven ingest).
4. **`workspace_id`** MUST be echoed on every top-level object the platform persists from this batch (the platform may inject it if omitted; connectors SHOULD set it explicitly).
5. **Severity mapping** MUST map vendor severities to: `informational`, `low`, `medium`, `high`, `critical`.
6. **Idempotency**: Use `source_ref` (JSONB) to carry vendor event IDs so the ingestion layer can deduplicate.
7. **Secrets**: Never read secrets from `integration_config` if stored in vault; the platform injects short-lived credentials via env or side-channel documented per connector.

## Transport modes

| Mode | Responsibility |
|------|----------------|
| Pull | Adapter polls external API on interval; calls `normalise()` per fetched item. |
| Push | External system POSTs to THMP ingestion URL; gateway authenticates; worker invokes `normalise()`. |

Webhooks MUST validate signatures per vendor documentation in the connector README.

## Health and observability

- Expose `GET /health` if the adapter runs as a standalone HTTP sidecar (optional).
- Log structured JSON with `connector_id`, `workspace_id`, and correlation id from the platform request headers.

## Versioning

- **Spec major bump** — Breaking changes to `NormalisedBatch` structure or required `normalise()` behaviour.
- **Connector package semver** — Independent; must declare compatible `thmp.connector_spec` version in metadata:

```toml
[project]
name = "thmp-connector-acme"
version = "0.2.0"

[tool.thmp]
connector_spec = "1.0.0"
```

## Compliance checklist (submitting a connector)

- [ ] Entry point registered under `thmp.connectors`.
- [ ] `normalise()` produces only documented enums and field types.
- [ ] README documents required `integration_config` keys and OAuth/API scopes.
- [ ] Integration tests using CDK (`thmp_cdk.testing.MockBatchApplier` or equivalent); first-party [connectors/example_webhook](connectors/example_webhook) is the reference.
- [ ] Licence compatible with Apache-2.0 project default.

## References

- [Core data model](docs/architecture/data-model.md)
- STIX 2.1: https://docs.oasis-open.org/cti/stix/v2.1/
- TAXII 2.1: https://docs.oasis-open.org/cti/taxii/v2.1/
