import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { UserAvatar } from '@/components/thmp/UserAvatar'
import { Button } from '@/components/ui/button'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type Row = {
  id: string
  kind: string
  message: string
  ref_type: string | null
  ref_id: string | null
  read_at: string | null
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

export function NotificationsPage() {
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!ws) return
    setError(null)
    try {
      const data = (await apiFetch('/api/v1/notifications')) as Row[]
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setRows([])
    }
  }, [ws])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  async function markRead(id: string) {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: 'POST' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
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
    <AppShell workspaceRole={role} onWorkspaceChange={() => void load()}>
      <PageHeader title="Inbox" subtitle="Recent workspace notifications and mention events." />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`rounded-lg border px-4 py-3 text-sm ${r.read_at ? 'border-border opacity-70' : 'border-primary/30 bg-muted/30'}`}
          >
            <div className="flex items-center gap-2">
              <UserAvatar initials={(r.kind || 'nt').slice(0, 2)} />
              <div className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()} · {r.kind}
              </div>
            </div>
            <p className="mt-1">{r.message}</p>
            {r.ref_type === 'hypothesis' && r.ref_id ? (
              <Link to={`/hypotheses/${r.ref_id}`} className="mt-2 inline-block text-primary text-xs underline">
                Open hypothesis
              </Link>
            ) : null}
            {!r.read_at ? (
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void markRead(r.id)}>
                Mark read
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {rows.length === 0 && !error ? (
        <p className="text-center text-sm text-muted-foreground">No notifications.</p>
      ) : null}
    </AppShell>
  )
}
