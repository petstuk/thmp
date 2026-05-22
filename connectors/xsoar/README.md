# THMP Connector — Palo Alto XSOAR

Connector ID: `palo_alto_xsoar`  
Mode: push/pull (XSOAR incident ingestion)  
Source type: `soar`

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `xsoar_url` | Base URL of the XSOAR instance (e.g. `https://xsoar.example.com`) |
| `api_key` | XSOAR API key |
| `playbook_id` | Default playbook to trigger on new incidents |

## Normalisation

Pass an XSOAR incident dict (or list of dicts) to `normalise()`. The XSOAR `id` is stored in `source_ref.incident_id` and the XSOAR incident URL can be reconstructed as `{xsoar_url}/#/incident/{incident_id}`.

## Fields mapped

| XSOAR field | THMP field |
|------------|-----------|
| `id` | `source_ref.incident_id`, `dedupe_key` |
| `name` | `title` |
| `details` | `description` |
| `severity` | `severity` |

## Severity mapping

| XSOAR severity | THMP severity |
|---------------|---------------|
| 0 (Unknown) | medium |
| 1 (Informational) | informational |
| 2 (Low) | low |
| 3 (Medium) | medium |
| 4 (High) | high |
| 5 (Critical) | critical |

## Playbook trigger

Call `xsoar.adapter.trigger_playbook(incident_id, playbook_id, xsoar_url, api_key)` to log intent to trigger an XSOAR playbook. A real implementation would POST to the XSOAR incidents API.

## Dedupe key

`xsoar:{incident_id}`
