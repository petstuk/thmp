# ServiceNow SIR connector

- **connector_id:** `servicenow_sir`
- **Config (non-secret):** `servicenow_url` (instance base URL)
- **Secrets:** username / password via integration `secret_ref` or config per your deployment.
- **Inbound:** `normalise()` accepts ServiceNow `sn_si_incident` row dict(s).
- **Write-back:** `update_incident_state()` when `THMP_CONNECTOR_LIVE_HTTP=1`.
