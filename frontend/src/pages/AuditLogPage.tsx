import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { ThmpCard } from '@/components/thmp/ThmpCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type AuditEvent = {
  id: string
  occurred_at?: string
  created_at?: string
  event_type?: string
  actor_id?: string | null
  resource_type?: string
  resource_id?: string | null
  summary?: string
  detail?: string | null
}

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

export function AuditLogPage() {
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null
  const [rows, setRows] = useState<AuditEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState('')
  const [actorId, setActorId] = useState('')
  const [resourceType, setResourceType] = useState('')

  const load = useCallback(async () => {
    if (!ws) return
    const q = new URLSearchParams()
    q.set('limit', '100')
    if (type.trim()) q.set('event_type', type.trim())
    if (actorId.trim()) q.set('actor_id', actorId.trim())
    if (resourceType.trim()) q.set('resource_type', resourceType.trim())
    setError(null)
    try {
      const data = (await apiFetch(`/api/v1/audit/events?${q.toString()}`)) as AuditEvent[]
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit events')
      setRows([])
    }
  }, [ws, type, actorId, resourceType])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- filter-driven fetch
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
    <AppShell workspaceRole={role} onWorkspaceChange={() => void load()} layout="wide">
      <PageHeader title="Audit Log" subtitle="Workspace event stream for state changes and administrative activity." />

      <ThmpCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="audit-type">Event type</Label>
            <Input id="audit-type" value={type} onChange={(e) => setType(e.target.value)} placeholder="hunt.updated" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-actor">Actor id</Label>
            <Input id="audit-actor" value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="UUID" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-resource">Resource type</Label>
            <Input id="audit-resource" value={resourceType} onChange={(e) => setResourceType(e.target.value)} placeholder="hypothesis" />
          </div>
        </div>
      </ThmpCard>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      <ThmpCard>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-sidebar-border font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Event</th>
                <th className="px-2 py-2">Actor</th>
                <th className="px-2 py-2">Resource</th>
                <th className="px-2 py-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const ts = row.occurred_at ?? row.created_at ?? ''
                return (
                  <tr key={row.id} className="border-b border-sidebar-border/70 align-top">
                    <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">
                      {ts ? new Date(ts).toLocaleString() : '—'}
                    </td>
                    <td className="px-2 py-2 font-mono text-[11.5px] text-foreground">{row.event_type ?? '—'}</td>
                    <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">
                      {row.actor_id ? `${row.actor_id.slice(0, 8)}…` : 'system'}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {row.resource_type ?? '—'}
                      {row.resource_id ? `:${row.resource_id.slice(0, 8)}…` : ''}
                    </td>
                    <td className="px-2 py-2 text-foreground">{row.summary ?? row.detail ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !error ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">No audit events for the selected filter.</p>
        ) : null}
      </ThmpCard>
    </AppShell>
  )
}
