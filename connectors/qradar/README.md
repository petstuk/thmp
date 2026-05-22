# THMP Connector — IBM QRadar

Connector ID: `ibm_qradar`  
Mode: pull (polling QRadar SIEM REST API)

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `qradar_url` | Base URL of your QRadar console (e.g. `https://qradar.example.com`) |
| `api_key` | QRadar SEC token (Authorization: SEC `<token>`) |

## Pull mode

The platform polls the QRadar offences endpoint for new/updated offences:
```
GET {qradar_url}/api/siem/offenses?filter=status%3DOPEN&sort=-start_time
```

Each offence dict is passed to `normalise()`. A list of offence dicts is also accepted.

## Fields mapped

| QRadar field | THMP field |
|-------------|-----------|
| `id` | `dedupe_key`, `source_ref.offence_id` |
| `description` | `title` (first line), `description` |
| `severity` (0–10) | `severity` |
| `rules` | `source_ref.rules` |

## Severity mapping (0–10)

| QRadar severity | THMP severity |
|----------------|---------------|
| 0–3 | low |
| 4–6 | medium |
| 7–8 | high |
| 9–10 | critical |

## Write-back

Call `qradar.adapter.update_offence_status(offence_id, status, qradar_url, api_key)` to log
intent to update an offence status in QRadar (e.g. mark as `CLOSED` after validation).
