import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type HypothesisRow = {
  id: string
  title: string
  status: string
}

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

export function EvidenceHubPage() {
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null
  const [items, setItems] = useState<HypothesisRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    setError(null)
    try {
      const data = (await apiFetch('/api/v1/hypotheses')) as HypothesisRow[]
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hypotheses')
      setItems([])
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

  return (
    <AppShell workspaceRole={role} onWorkspaceChange={() => void load()}>
      <h1 className="mb-2 text-2xl font-semibold">Evidence</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Evidence items are scoped to a hypothesis. Open a hypothesis to add or review evidence.
      </p>
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
                <div className="text-xs text-muted-foreground">{h.status}</div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {items.length === 0 && !error ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No hypotheses in this workspace.</p>
      ) : null}
    </AppShell>
  )
}
