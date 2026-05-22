# THMP Connector — STIX/TAXII 2.1

Connector ID: `stix_taxii`  
Mode: pull (polling TAXII 2.1 collections)

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `taxii_base_url` | Base URL of the TAXII 2.1 server (e.g. `https://taxii.example.com`) |
| `taxii_username` | HTTP Basic auth username |
| `taxii_password` | HTTP Basic auth password |

## Pull mode

The platform polls TAXII 2.1 collection manifests and fetches STIX bundles via:
```
GET {taxii_base_url}/taxii2/
GET {taxii_base_url}/api-root/collections/
GET {taxii_base_url}/api-root/collections/{id}/objects/
```

The STIX bundle JSON is parsed and passed as a `dict` to `normalise()`.

## Supported STIX object types

| STIX type | Notes |
|-----------|-------|
| `indicator` | Pattern-based threat indicators |
| `attack-pattern` | Mapped to ATT&CK via `external_references` |
| `threat-actor` | Attribution |
| `campaign` | Activity cluster |
| `malware` | Malware family |

Other STIX types (e.g. `relationship`, `identity`) are silently skipped.

## Severity mapping

Derived from the STIX `confidence` field (0–100):

| Confidence | THMP severity |
|-----------|---------------|
| > 80 | high |
| > 50 | medium |
| ≤ 50 | low |

## ATT&CK hints

`external_references` entries with `source_name == "mitre-attack"` are extracted and stored in
`metadata.attack_technique_hints`.
