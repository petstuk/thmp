import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { JsonSchemaObjectForm } from '@/components/JsonSchemaObjectForm'
import { ApiError, apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'
import { CONNECTOR_CONFIG_SCHEMAS } from '@/lib/connectorConfigSchemas'

type IntegrationRow = {
  id: string
  workspace_id: string
  connector_id: string
  name: string | null
  config: Record<string, unknown>
  secret_ref: string | null
  is_enabled: boolean
}

const MANAGE_ROLES = new Set(['admin', 'manager'])

function integrationsErrorMessage(err: unknown, context: 'load' | 'create' | 'save'): string {
  const base =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : context === 'load'
          ? 'Failed to load'
          : context === 'create'
            ? 'Create failed'
            : 'Update failed'
  if (err instanceof ApiError && err.status === 404) {
    return `${base}\n\nIntegrations are provided by the user service. Keep VITE_API_BASE_URL empty (Compose default) so /api is proxied to Traefik on port 80, or set it to the user service origin (e.g. http://127.0.0.1:8001). If it points only at the hypothesis service (port 8002), /api/v1/integrations returns 404. After changing .env, restart the Vite dev server.`
  }
  return base
}

function parseConfigJson(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw) as unknown
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function IntegrationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<IntegrationRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [createConnectorId, setCreateConnectorId] = useState('example_webhook')
  const [createName, setCreateName] = useState('')
  const [createConfigJson, setCreateConfigJson] = useState('{}')
  const [createSecret, setCreateSecret] = useState('')
  const [edits, setEdits] = useState<Record<string, { configJson: string; is_enabled: boolean }>>({})
  const [rowSecrets, setRowSecrets] = useState<Record<string, string>>({})
  const [testingId, setTestingId] = useState<string | null>(null)

  const workspaceId = getWorkspaceId() || ''
  const workspaceRole = user?.workspaces.find((w) => w.id === workspaceId)?.role ?? null
  const canManage = workspaceRole != null && MANAGE_ROLES.has(workspaceRole)

  const load = useCallback(async () => {
    if (!getWorkspaceId() || !canManage) return
    setError(null)
    try {
      const data = (await apiFetch('/api/v1/integrations')) as IntegrationRow[]
      setItems(Array.isArray(data) ? data : [])
      const next: Record<string, { configJson: string; is_enabled: boolean }> = {}
      for (const row of data) {
        next[row.id] = {
          configJson: JSON.stringify(row.config ?? {}, null, 2),
          is_enabled: row.is_enabled,
        }
      }
      setEdits(next)
    } catch (err) {
      setError(integrationsErrorMessage(err, 'load'))
    }
  }, [canManage])

  useEffect(() => {
    if (user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- default JSON when user loads
      setCreateConfigJson(JSON.stringify({ ingest_actor_user_id: user.id }, null, 2))
    }
  }, [user?.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch when allowed
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const config = parseConfigJson(createConfigJson)
    if (!config) {
      setError('Create config must be valid JSON object')
      return
    }
    try {
      await apiFetch('/api/v1/integrations', {
        method: 'POST',
        body: JSON.stringify({
          connector_id: createConnectorId.trim(),
          name: createName.trim() || null,
          config,
          secret_ref: createSecret.trim() || null,
        }),
      })
      setCreateName('')
      setCreateSecret('')
      setInfo('Integration created.')
      await load()
    } catch (err) {
      setError(integrationsErrorMessage(err, 'create'))
    }
  }

  async function saveRow(id: string) {
    setError(null)
    setInfo(null)
    const ed = edits[id]
    if (!ed) return
    const config = parseConfigJson(ed.configJson)
    if (!config) {
      setError('Config must be valid JSON object')
      return
    }
    const sec = rowSecrets[id]?.trim()
    try {
      await apiFetch(`/api/v1/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          config,
          is_enabled: ed.is_enabled,
          ...(sec ? { secret_ref: sec } : {}),
        }),
      })
      setRowSecrets((prev) => {
        const n = { ...prev }
        delete n[id]
        return n
      })
      setInfo('Integration saved.')
      await load()
    } catch (err) {
      setError(integrationsErrorMessage(err, 'save'))
    }
  }

  async function testRow(id: string) {
    setError(null)
    setInfo(null)
    setTestingId(id)
    try {
      await apiFetch(`/api/v1/integrations/${id}/test`, { method: 'POST', body: '{}' })
      setInfo('Test connection: OK (connector health_check passed).')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Test connection failed')
    } finally {
      setTestingId(null)
    }
  }

  const createSchema = CONNECTOR_CONFIG_SCHEMAS[createConnectorId]
  const createParsed = parseConfigJson(createConfigJson) ?? {}

  if (!user) {
    return (
      <div className="px-4 py-16 text-center">
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <AppShell workspaceRole={workspaceRole} onWorkspaceChange={() => void load()}>
      <PageHeader
        title="Integrations"
        subtitle="Configure connector IDs and JSON config; keep tokens in secret_ref and validate with health_check."
      />

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Workspace admin or manager role required to manage integrations.
        </p>
      ) : null}

      {info ? (
        <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {info}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-destructive whitespace-pre-wrap" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Add integration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="int-connector">Connector ID</Label>
                  <Input
                    id="int-connector"
                    value={createConnectorId}
                    onChange={(e) => setCreateConnectorId(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="int-name">Display name (optional)</Label>
                  <Input id="int-name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
                </div>
              </div>
              {createSchema ? (
                <div className="space-y-2">
                  <Label>Config (form)</Label>
                  <JsonSchemaObjectForm
                    schema={createSchema}
                    value={createParsed}
                    onChange={(obj) => setCreateConfigJson(JSON.stringify(obj, null, 2))}
                    idPrefix="create"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="int-config">Config JSON</Label>
                <Textarea
                  id="int-config"
                  className="font-mono text-sm"
                  rows={6}
                  value={createConfigJson}
                  onChange={(e) => setCreateConfigJson(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="int-secret">Secret / token (optional)</Label>
                <Input
                  id="int-secret"
                  type="password"
                  autoComplete="off"
                  value={createSecret}
                  onChange={(e) => setCreateSecret(e.target.value)}
                  placeholder="Stored as encrypted secret_ref"
                />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canManage ? (
        <ul className="space-y-6">
          {items.map((row) => {
            const sch = CONNECTOR_CONFIG_SCHEMAS[row.connector_id]
            const rowParsed =
              parseConfigJson(edits[row.id]?.configJson ?? JSON.stringify(row.config ?? {}, null, 2)) ?? {}
            const secretLabel =
              row.secret_ref === '***' ? 'stored (update below to replace)' : row.secret_ref ?? '—'
            return (
              <li key={row.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {row.connector_id}
                      {row.name ? ` — ${row.name}` : ''}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Enabled: {row.is_enabled ? 'yes' : 'no'} · secret_ref: {secretLabel}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        id={`en-${row.id}`}
                        checked={edits[row.id]?.is_enabled ?? row.is_enabled}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: {
                              configJson:
                                prev[row.id]?.configJson ?? JSON.stringify(row.config ?? {}, null, 2),
                              is_enabled: e.target.checked,
                            },
                          }))
                        }
                      />
                      <Label htmlFor={`en-${row.id}`} className="font-normal">
                        Enabled
                      </Label>
                    </div>
                    {sch ? (
                      <div className="space-y-2">
                        <Label>Config (form)</Label>
                        <JsonSchemaObjectForm
                          schema={sch}
                          value={rowParsed}
                          onChange={(obj) =>
                            setEdits((prev) => ({
                              ...prev,
                              [row.id]: {
                                configJson: JSON.stringify(obj, null, 2),
                                is_enabled: prev[row.id]?.is_enabled ?? row.is_enabled,
                              },
                            }))
                          }
                          idPrefix={`row-${row.id}`}
                        />
                      </div>
                    ) : null}
                    <Textarea
                      className="font-mono text-sm"
                      rows={8}
                      value={edits[row.id]?.configJson ?? JSON.stringify(row.config ?? {}, null, 2)}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [row.id]: {
                            configJson: e.target.value,
                            is_enabled: prev[row.id]?.is_enabled ?? row.is_enabled,
                          },
                        }))
                      }
                    />
                    <div className="space-y-1">
                      <Label htmlFor={`sec-${row.id}`}>New secret (optional)</Label>
                      <Input
                        id={`sec-${row.id}`}
                        type="password"
                        autoComplete="off"
                        value={rowSecrets[row.id] ?? ''}
                        onChange={(e) =>
                          setRowSecrets((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        placeholder="Leave blank to keep existing secret"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => void saveRow(row.id)}>
                        Save changes
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={testingId === row.id}
                        onClick={() => void testRow(row.id)}
                      >
                        {testingId === row.id ? 'Testing…' : 'Test connection'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : null}

      {canManage && items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No integrations yet.</p>
      ) : null}
    </AppShell>
  )
}
