# THMP Connector — Elastic Supply Chain Monitor

Connector ID: `elastic_scm`  
Mode: pull (polling) + push (webhook)

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `scm_base_url` | Base URL of the Elastic SCM API (e.g. `https://scm.example.com`) |
| `api_key` | Bearer token for API authentication |

## Pull mode

The platform polls `GET {scm_base_url}/api/v1/findings?since={last_fetched_at}` and passes the
response body (a list of finding objects) to `normalise()`.

## Push / Webhook mode

Configure the SCM to POST individual finding payloads to the THMP ingest endpoint.  
`normalise()` accepts both a single finding `dict` and a list of findings.

### Webhook setup

1. In the Elastic SCM admin console, navigate to **Integrations → Webhooks**.
2. Add a new webhook pointing to:
   ```
   https://<thmp-host>/api/v1/integrations/ingest/<workspace_id>/elastic_scm
   ```
3. Set the secret and store it in THMP's `integration_config.webhook_secret` for HMAC verification.

## Severity mapping

| SCM severity | THMP severity |
|-------------|---------------|
| critical | critical |
| high | high |
| medium | medium |
| low | low |
| info | informational |

## ATT&CK hints

Every finding is pre-annotated with **T1195 – Supply Chain Compromise**.

## Write-back (hypothesis validated)

Call `elastic_scm.adapter.post_confirmation(finding_id, scm_base_url, api_key)` after a
hypothesis transitions to `validated`.
