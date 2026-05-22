# THMP Connector — Qualys VMDR

Connector ID: `qualys`  
Mode: pull (vulnerability findings)  
Source type: `vuln_scanner`

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `qualys_api_url` | Base URL of the Qualys API (e.g. `https://qualysapi.qualys.com`) |
| `username` | Qualys API username |
| `password` | Qualys API password |

## Pull mode

The platform fetches vulnerability findings from the Qualys VMDR API and passes each finding dict (or a list of dicts) to `normalise()`.

## Fields mapped

| Qualys field | THMP field |
|-------------|-----------|
| `qid` | `source_ref.qid`, `dedupe_key` |
| `asset_id` | `source_ref.asset_id`, `dedupe_key` |
| `asset_hostname` | `source_ref.asset_hostname`, `title` |
| `cve_id` | `source_ref.cve_id`, `description` |
| `cvss3_base_score` | `source_ref.cvss3_base_score`, `metadata` |
| `severity_level` | `severity` |

## Severity mapping

| Qualys severity_level | THMP severity |
|----------------------|---------------|
| 1 | critical |
| 2 | high |
| 3 | medium |
| 4 | low |
| 5 | informational |

## ATT&CK hints

Findings with `severity_level` 1 or 2 automatically include `metadata.attack_hints = ["T1190", "T1203"]` to suggest likely exploitation techniques (Exploit Public-Facing Application, Exploitation for Client Execution).

## Dedupe key

`qualys:{asset_id}:{qid}`
