import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

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

export function IntegrationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<IntegrationRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createConnectorId, setCreateConnectorId] = useState('example_webhook')
  const [createName, setCreateName] = useState('')
  const [createConfigJson, setCreateConfigJson] = useState('{}')
  const [edits, setEdits] = useState<Record<string, { configJson: string; is_enabled: boolean }>>({})

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
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }, [canManage])

  useEffect(() => {
    if (user?.id) {
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
    let config: Record<string, unknown>
    try {
      config = JSON.parse(createConfigJson) as Record<string, unknown>
    } catch {
      setError('Create config must be valid JSON')
      return
    }
    try {
      await apiFetch('/api/v1/integrations', {
        method: 'POST',
        body: JSON.stringify({
          connector_id: createConnectorId.trim(),
          name: createName.trim() || null,
          config,
        }),
      })
      setCreateName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    }
  }

  async function saveRow(id: string) {
    setError(null)
    const ed = edits[id]
    if (!ed) return
    let config: Record<string, unknown> | undefined
    try {
      config = JSON.parse(ed.configJson) as Record<string, unknown>
    } catch {
      setError('Config must be valid JSON')
      return
    }
    try {
      await apiFetch(`/api/v1/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          config,
          is_enabled: ed.is_enabled,
        }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Configure connector IDs and non-secret JSON for your workspace.{' '}
          <code className="text-xs">secret_ref</code> is masked in API responses after save.
        </p>
      </header>

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Workspace admin or manager role required to manage integrations.
        </p>
      ) : null}

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

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
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canManage ? (
        <ul className="space-y-6">
          {items.map((row) => (
            <li key={row.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {row.connector_id}
                    {row.name ? ` — ${row.name}` : ''}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Enabled: {row.is_enabled ? 'yes' : 'no'} · secret_ref: {row.secret_ref ?? '—'}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`en-${row.id}`}
                      checked={edits[row.id]?.is_enabled ?? row.is_enabled}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [row.id]: {
                            configJson: prev[row.id]?.configJson ?? JSON.stringify(row.config ?? {}, null, 2),
                            is_enabled: e.target.checked,
                          },
                        }))
                      }
                    />
                    <Label htmlFor={`en-${row.id}`} className="font-normal">
                      Enabled
                    </Label>
                  </div>
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
                  <Button type="button" size="sm" variant="secondary" onClick={() => void saveRow(row.id)}>
                    Save changes
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {canManage && items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No integrations yet.</p>
      ) : null}
    </AppShell>
  )
}
