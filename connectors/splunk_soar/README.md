# THMP Connector — Splunk SOAR (Phantom)

Connector ID: `splunk_soar`  
Mode: bidirectional (container ingestion + action triggering)  
Source type: `soar`

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `soar_url` | Base URL of the Splunk SOAR instance (e.g. `https://soar.example.com`) |
| `api_token` | Splunk SOAR REST API token |

## Normalisation

Pass a Phantom container dict (or list of dicts) to `normalise()`. The container `id` is stored in `source_ref.container_id` and `metadata.phantom_container_id`.

## Fields mapped

| Phantom field | THMP field |
|--------------|-----------|
| `id` | `source_ref.container_id`, `dedupe_key` |
| `name` | `title` |
| `description` | `description` |
| `severity` | `severity` |

## Severity mapping

| Phantom severity | THMP severity |
|-----------------|---------------|
| high | high |
| medium | medium |
| low | low |
| (other) | medium |

## Write-back stubs

- `splunk_soar.adapter.trigger_action(container_id, action_name, soar_url, token)` — log intent to trigger a SOAR playbook action.
- `splunk_soar.adapter.sync_container(container_id, soar_url, token)` — log intent to pull updated container state from SOAR.

## Dedupe key

`phantom:{container_id}`
