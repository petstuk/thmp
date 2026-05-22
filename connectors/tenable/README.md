# THMP Connector — Tenable.io

Connector ID: `tenable_io`  
Mode: pull (polling Tenable.io Vulnerability Management API)

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `access_key` | Tenable.io API access key |
| `secret_key` | Tenable.io API secret key |
| `api_url` | Base URL (default: `https://cloud.tenable.com`) |

## Authentication

Requests use Tenable.io API key authentication:
```
X-ApiKeys: accessKey={access_key};secretKey={secret_key}
```

## Pull mode

The platform polls the Tenable.io exports API:
```
POST {api_url}/vulns/export           → initiate export
GET  {api_url}/vulns/export/{id}/chunks/{chunk_id}  → fetch results
```

Each vulnerability finding dict (from the chunks response) is passed to `normalise()`.

## Fields mapped

| Tenable field | THMP field |
|--------------|-----------|
| `asset_id` | `dedupe_key`, `source_ref.asset_id` |
| `asset_hostname` / `hostname` | `title`, `source_ref.asset_hostname` |
| `cve_id` / `cve` | `title`, `dedupe_key`, `source_ref.cve_id` |
| `cvss3_base_score` | `metadata.cvss3_base_score` |
| `severity` | `severity` |

## Severity mapping

| Tenable severity | THMP severity |
|----------------|---------------|
| critical | critical |
| high | high |
| medium | medium |
| low | low |
| info | informational |

## ATT&CK hints (critical and high severity only)

- **T1190** – Exploit Public-Facing Application
- **T1203** – Exploitation for Client Execution

Stored in `metadata.attack_technique_hints`.
