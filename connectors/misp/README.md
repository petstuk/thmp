# THMP Connector — MISP

Connector ID: `misp`  
Mode: pull (polling MISP REST API)

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `misp_url` | Base URL of your MISP instance (e.g. `https://misp.example.com`) |
| `api_key` | MISP Automation key (found in `My Profile → Auth key`) |

## Pull mode

The platform calls `GET {misp_url}/events/restSearch` with a `since` timestamp and passes each
returned MISP event dict to `normalise()`.

`normalise()` accepts both a bare MISP event dict and a `{"Event": {...}}` wrapper.

## Attribute / IOC extraction

The following MISP attribute types are extracted as IOCs and placed in `NormalisedBatch.iocs`:

`ip-src`, `ip-dst`, `domain`, `url`, `md5`, `sha256`, `email-src`

## Severity mapping (threat_level_id)

| MISP threat_level_id | THMP severity |
|---------------------|---------------|
| 1 (High) | high |
| 2 (Medium) | medium |
| 3 (Low) | low |
| 4 (Undefined) | informational |

## ATT&CK hints

Extracted from:
- MISP tags containing `mitre-attack-pattern` (e.g. `misp-galaxy:mitre-attack-pattern="T1566"`)
- MISP Galaxy clusters of type `mitre-attack-pattern`

Stored in `metadata.attack_technique_hints`.

## Write-back (export to MISP)

Call `misp.adapter.export_finding_to_misp(finding, misp_url, api_key)` to log intent to
create a MISP event from a THMP finding. Implement HTTP call when ready.
