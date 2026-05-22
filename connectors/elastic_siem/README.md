# THMP Connector — Elastic SIEM

Connector ID: `elastic_siem`  
Mode: pull (polling Elastic Security detection alerts API)

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `elastic_url` | Base URL of your Elasticsearch / Kibana cluster (e.g. `https://elastic.example.com:9200`) |
| `api_key` | Elasticsearch API key (`id:api_key` Base64-encoded) |
| `space_id` | Kibana space ID (use `default` for the default space) |

## Pull mode

The platform queries the Elastic Security detections API for new alerts:
```
POST {elastic_url}/s/{space_id}/api/detection_engine/signals/search
```

Each alert hit (including `_id` and `kibana.alert.*` fields) is passed to `normalise()`.

## Fields mapped

| Elastic field | THMP field |
|--------------|-----------|
| `_id` | `dedupe_key`, `source_ref.alert_id` |
| `kibana.alert.rule.name` | `title` |
| `kibana.alert.reason` | `description` |
| `kibana.alert.severity` | `severity` |
| `kibana.alert.rule.timeline_id` | `source_ref.timeline_id` |

The adapter handles both flat dicts and `_source`-wrapped Elasticsearch hits.

## Severity mapping

| Elastic severity | THMP severity |
|----------------|---------------|
| critical | critical |
| high | high |
| medium | medium |
| low | low |

## Timeline evidence reference

`source_ref.timeline_id` enables linking to the Kibana Timeline associated with the rule.
