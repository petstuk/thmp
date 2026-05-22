import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { ThmpCard } from '@/components/thmp/ThmpCard'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type FindingRow = {
  id: string
  hunt_id: string
  title: string
  outcome: string
  created_at: string
}

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

export function FindingsPage() {
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null
  const [items, setItems] = useState<FindingRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    setError(null)
    try {
      const data = (await apiFetch('/api/v1/hunts/findings')) as FindingRow[]
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load findings')
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
      <PageHeader title="Findings" subtitle="Outcome records captured from hunt execution." />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <ul className="space-y-3 text-left">
        {items.map((f) => (
          <li key={f.id}>
            <ThmpCard>
              <div>
                <div className="font-medium text-foreground">{f.title}</div>
                <div className="text-xs text-muted-foreground">
                  {f.outcome} · hunt {f.hunt_id.slice(0, 8)}… ·{' '}
                  {new Date(f.created_at).toLocaleString()}
                </div>
              </div>
            </ThmpCard>
          </li>
        ))}
      </ul>
      {items.length === 0 && !error ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No findings in this workspace yet.</p>
      ) : null}
    </AppShell>
  )
}
