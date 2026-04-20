import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type Hypothesis = {
  id: string
  title: string
  status: string
  severity: string
  source_type: string
  workspace_id: string
}

export function IngestionQueuePage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Hypothesis[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    setError(null)
    try {
      const data = (await apiFetch('/api/v1/hypotheses?integration_queue=true')) as Hypothesis[]
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  if (!user) {
    return (
      <div className="px-4 py-16 text-center">
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </div>
    )
  }

  const workspaceId = getWorkspaceId() || ''
  const workspaceRole = user.workspaces.find((w) => w.id === workspaceId)?.role ?? null

  return (
    <AppShell workspaceRole={workspaceRole} onWorkspaceChange={() => void load()}>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Ingestion queue</h1>
        <p className="text-sm text-muted-foreground">
          Draft hypotheses from connector ingest (`source_type=integration`). Open a row to review and transition status.
        </p>
      </header>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <ul className="space-y-3 text-left">
        {items.map((h) => (
          <li key={h.id}>
            <Card>
              <CardContent className="py-4">
                <Link
                  to={`/hypotheses/${h.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {h.title}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {h.status} · {h.severity} · source: {h.source_type}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No queued ingestion items. Connectors create drafts here after a successful ingest.
        </p>
      ) : null}
    </AppShell>
  )
}
