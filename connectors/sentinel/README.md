# THMP Connector — Microsoft Sentinel

Connector ID: `microsoft_sentinel`  
Mode: pull (polling Azure Monitor / Sentinel REST API)

## Required `integration_config` keys

| Key | Description |
|-----|-------------|
| `tenant_id` | Azure AD tenant ID |
| `subscription_id` | Azure subscription ID |
| `workspace_name` | Log Analytics workspace name |
| `client_id` | Azure AD app registration client ID |
| `client_secret` | Azure AD app registration client secret |

## Authentication

The platform authenticates with Azure AD using the OAuth 2.0 client credentials flow:
```
POST https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token
```
with scope `https://management.azure.com/.default`.

## Pull mode

The platform polls the Sentinel Incidents API:
```
GET https://management.azure.com/subscriptions/{subscription_id}/resourceGroups/{rg}/
    providers/Microsoft.OperationalInsights/workspaces/{workspace_name}/
    providers/Microsoft.SecurityInsights/incidents?api-version=2023-11-01
```

Each incident dict (Azure Resource Manager format, or bare dict with flat fields) is passed to
`normalise()`.

## Severity mapping

| Sentinel severity | THMP severity |
|-----------------|---------------|
| High | high |
| Medium | medium |
| Low | low |
| Informational | informational |

## ATT&CK tactic hints

`additionalData.tactics` from the incident is stored in `metadata.attack_tactic_hints`.

## Write-back

Call `sentinel.adapter.create_sentinel_incident(finding, tenant_id, workspace_name, token)` to
log intent to create a Sentinel incident from a THMP finding.
