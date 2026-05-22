# THMP Connector — Splunk Enterprise Security

Connector ID: `splunk_es`  
Mode: pull (polling ES Notable Events)  
Supports: Splunk Enterprise and Splunk Cloud (same API surface)

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `splunk_url` | Base URL of your Splunk instance (e.g. `https://splunk.example.com:8089`) |
| `api_token` | Splunk API token (or session key) for authentication |

## Pull mode

The platform queries the Splunk REST API for new ES notable events:
```
GET {splunk_url}/servicesNS/nobody/SplunkEnterpriseSecuritySuite/alerts/fired_alerts
```

Each notable event dict is passed to `normalise()`. A list of notable event dicts is also accepted.

## Fields mapped

| Splunk field | THMP field |
|-------------|-----------|
| `rule_name` / `search_name` | `title` |
| `description` / `rule_description` | `description` |
| `urgency` | `severity` |
| `event_id` / `notable_id` | `dedupe_key`, `source_ref.event_id` |
| `search_name` | `source_ref.search_name` |
| `event_hash` | `source_ref.event_hash` |

## Urgency → severity mapping

| Splunk urgency | THMP severity |
|---------------|---------------|
| critical | critical |
| high | high |
| medium | medium |
| low | low |
| informational | informational |

## Saved-search evidence linking

`source_ref.search_name` and `source_ref.event_hash` enable linking back to the Splunk
saved-search that fired the notable.

## Write-back

Call `splunk.adapter.create_notable_from_finding(finding, splunk_base, token)` to log
intent to create a Splunk ES notable from a THMP finding.
