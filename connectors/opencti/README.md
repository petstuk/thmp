# THMP Connector — OpenCTI

Connector ID: `opencti`  
Mode: pull (polling OpenCTI GraphQL / REST API)

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `opencti_url` | Base URL of your OpenCTI instance (e.g. `https://opencti.example.com`) |
| `api_key` | OpenCTI API token (User settings → API access) |

## Pull mode

The platform queries OpenCTI for new objects since the last poll and passes a list of entity
dicts to `normalise()`. A single entity dict is also accepted.

## Supported entity types

| OpenCTI type | Notes |
|-------------|-------|
| `Report` | Threat intelligence report |
| `Indicator` | Threat indicator (pattern-based) |
| `Threat-Actor` | Attribution entity |
| `Malware` | Malware family |
| `Attack-Pattern` | TTPs |

Other types are silently skipped.

## Severity mapping (confidence 0–100)

| Confidence | THMP severity |
|-----------|---------------|
| > 75 | high |
| > 50 | medium |
| ≤ 50 | low |

## ATT&CK tactic hints

Kill chain phase names from `kill_chain_phases` are mapped to ATT&CK tactic names and stored
in `metadata.attack_tactic_hints`.
