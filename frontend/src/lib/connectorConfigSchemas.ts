/**
 * Per-connector JSON Schemas for integration config forms (non-secret keys).
 * Aligns with connector README / adapter `health_check` expectations.
 */
export type JsonSchemaProp = {
  type: 'string' | 'number' | 'integer' | 'boolean'
  title?: string
  description?: string
  default?: unknown
}

export type ConnectorConfigSchema = {
  type: 'object'
  properties: Record<string, JsonSchemaProp>
  required?: string[]
}

export const CONNECTOR_CONFIG_SCHEMAS: Record<string, ConnectorConfigSchema> = {
  example_webhook: {
    type: 'object',
    properties: {
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id', description: 'UUID of user owning ingested hypotheses' },
      title_prefix: { type: 'string', title: 'Title prefix', default: '' },
    },
    required: ['ingest_actor_user_id'],
  },
  elastic_scm: {
    type: 'object',
    properties: {
      base_url: { type: 'string', title: 'SCM API base URL' },
      api_token: { type: 'string', title: 'API token (or use secret_ref)', description: 'Prefer secret vault for tokens' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['base_url', 'ingest_actor_user_id'],
  },
  stix_taxii: {
    type: 'object',
    properties: {
      server_url: { type: 'string', title: 'TAXII server root URL' },
      collection_id: { type: 'string', title: 'Collection id' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['server_url', 'collection_id', 'ingest_actor_user_id'],
  },
  misp: {
    type: 'object',
    properties: {
      base_url: { type: 'string', title: 'MISP base URL' },
      api_key: { type: 'string', title: 'API key reference hint', description: 'Store secret in secret_ref if possible' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['base_url', 'ingest_actor_user_id'],
  },
  opencti: {
    type: 'object',
    properties: {
      graphql_url: { type: 'string', title: 'OpenCTI GraphQL URL' },
      token: { type: 'string', title: 'Token (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['graphql_url', 'ingest_actor_user_id'],
  },
  splunk_es: {
    type: 'object',
    properties: {
      host: { type: 'string', title: 'Splunk host / management URI' },
      token: { type: 'string', title: 'HEC or session token (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['host', 'ingest_actor_user_id'],
  },
  microsoft_sentinel: {
    type: 'object',
    properties: {
      tenant_id: { type: 'string', title: 'Azure tenant id' },
      client_id: { type: 'string', title: 'App client id' },
      workspace_id: { type: 'string', title: 'Log Analytics workspace id' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['tenant_id', 'client_id', 'workspace_id', 'ingest_actor_user_id'],
  },
  elastic_siem: {
    type: 'object',
    properties: {
      base_url: { type: 'string', title: 'Kibana / Elasticsearch URL' },
      api_key: { type: 'string', title: 'API key (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['base_url', 'ingest_actor_user_id'],
  },
  ibm_qradar: {
    type: 'object',
    properties: {
      host: { type: 'string', title: 'QRadar host' },
      sec_token: { type: 'string', title: 'SEC token (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['host', 'ingest_actor_user_id'],
  },
  tenable_io: {
    type: 'object',
    properties: {
      access_key: { type: 'string', title: 'Access key id' },
      secret_key: { type: 'string', title: 'Secret (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['ingest_actor_user_id'],
  },
  qualys: {
    type: 'object',
    properties: {
      api_server: { type: 'string', title: 'Qualys API server host' },
      username: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['api_server', 'ingest_actor_user_id'],
  },
  palo_alto_xsoar: {
    type: 'object',
    properties: {
      base_url: { type: 'string', title: 'XSOAR base URL' },
      api_key: { type: 'string', title: 'API key (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['base_url', 'ingest_actor_user_id'],
  },
  splunk_soar: {
    type: 'object',
    properties: {
      base_url: { type: 'string', title: 'SOAR base URL' },
      token: { type: 'string', title: 'Token (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['base_url', 'ingest_actor_user_id'],
  },
  jira: {
    type: 'object',
    properties: {
      base_url: { type: 'string', title: 'Jira site URL' },
      email: { type: 'string', title: 'Service account email' },
      api_token: { type: 'string', title: 'API token (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['base_url', 'ingest_actor_user_id'],
  },
  servicenow_sir: {
    type: 'object',
    properties: {
      instance_url: { type: 'string', title: 'ServiceNow instance URL' },
      username: { type: 'string', title: 'Integration user' },
      password: { type: 'string', title: 'Password (prefer secret_ref)' },
      ingest_actor_user_id: { type: 'string', title: 'Ingest actor user id' },
    },
    required: ['instance_url', 'ingest_actor_user_id'],
  },
  slack: {
    type: 'object',
    properties: {
      webhook_url: { type: 'string', title: 'Incoming webhook URL', description: 'Also storable in secret_ref' },
      trigger_on: {
        type: 'string',
        title: 'Trigger events',
        description: 'Comma-separated event types, e.g. hypothesis.validated,hunt.closed',
      },
    },
    required: [],
  },
  microsoft_teams: {
    type: 'object',
    properties: {
      webhook_url: { type: 'string', title: 'Incoming webhook URL' },
    },
    required: ['webhook_url'],
  },
  pagerduty: {
    type: 'object',
    properties: {
      routing_key: { type: 'string', title: 'Events API v2 routing key', description: 'Prefer secret_ref' },
    },
    required: [],
  },
  email_smtp: {
    type: 'object',
    properties: {
      smtp_host: { type: 'string', title: 'SMTP host' },
      smtp_port: { type: 'integer', title: 'SMTP port', default: 587 },
      from_address: { type: 'string', title: 'From address' },
      to_addresses: { type: 'string', title: 'Recipients', description: 'Comma-separated emails' },
    },
    required: ['smtp_host', 'from_address', 'to_addresses'],
  },
}
