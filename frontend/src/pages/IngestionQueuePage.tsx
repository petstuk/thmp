import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SeverityBadge, StatusBadge } from '@/components/ThreatBadges'
import { ApiError, apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type Hypothesis = {
  id: string
  title: string
  status: string
  severity: string
  source_type: string
  workspace_id: string
  confidence_score: number
  updated_at: string
  metadata?: Record<string, unknown> | null
}

type TriageTab = 'all' | 'auto' | 'review'

export function IngestionQueuePage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Hypothesis[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TriageTab>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    p.set('integration_queue', 'true')
    if (tab === 'auto') p.set('ingest_triage', 'auto')
    if (tab === 'review') p.set('ingest_triage', 'review')
    return `?${p.toString()}`
  }, [tab])

  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    setError(null)
    try {
      const data = (await apiFetch(`/api/v1/hypotheses${qs}`)) as Hypothesis[]
      setItems(Array.isArray(data) ? data : [])
      setSelected(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }, [qs])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount / tab fetch
    void load()
  }, [load])

  const workspaceId = getWorkspaceId() || ''
  const workspaceRole = user?.workspaces.find((w) => w.id === workspaceId)?.role ?? null

  const canAccept =
    workspaceRole != null &&
    ['analyst', 'hunt_lead', 'ti_analyst', 'manager', 'admin'].includes(workspaceRole)
  const canDismiss =
    workspaceRole != null && ['hunt_lead', 'manager', 'admin'].includes(workspaceRole)

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function selectAll() {
    if (selected.size === items.length) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(items.map((h) => h.id)))
  }

  async function bulkTransition(to: 'active' | 'closed') {
    if (selected.size === 0) return
    if (to === 'active' && !canAccept) return
    if (to === 'closed' && !canDismiss) return
    const ids = [...selected]
    setBusy(true)
    setError(null)
    try {
      await Promise.all(
        ids.map(async (id) => {
          const h = items.find((x) => x.id === id)
          if (!h) return
          const comment =
            to === 'active' ? 'Accepted from ingestion triage (bulk)' : 'Dismissed from ingestion triage (bulk)'
          await apiFetch(`/api/v1/hypotheses/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: to,
              transition_comment: comment,
            }),
            ifMatch: h.updated_at,
          })
        }),
      )
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Conflict: list was stale. Refreshed — retry bulk action.')
        await load()
      } else {
        setError(err instanceof Error ? err.message : 'Bulk update failed')
      }
    } finally {
      setBusy(false)
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
      <PageHeader
        title="Ingestion Queue"
        subtitle="Draft hypotheses from connector ingest, grouped by auto-triage confidence."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['auto', 'Auto-triage (high confidence)'],
            ['review', 'Needs review (low confidence)'],
          ] as const
        ).map(([k, label]) => (
          <Button key={k} type="button" size="sm" variant={tab === k ? 'default' : 'outline'} onClick={() => setTab(k)}>
            {label}
          </Button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => selectAll()}>
          {selected.size === items.length && items.length > 0 ? 'Clear selection' : 'Select all'}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canAccept || selected.size === 0 || busy}
          onClick={() => void bulkTransition('active')}
        >
          Accept selected → active
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={!canDismiss || selected.size === 0 || busy}
          onClick={() => void bulkTransition('closed')}
        >
          Dismiss selected → closed
        </Button>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <ul className="space-y-3 text-left">
        {items.map((h) => (
          <li key={h.id}>
            <Card>
              <CardContent className="flex flex-wrap items-start gap-3 py-4">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(h.id)}
                  onChange={() => toggle(h.id)}
                  aria-label={`Select ${h.title}`}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/hypotheses/${h.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {h.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <StatusBadge value={h.status} />
                    <SeverityBadge value={h.severity} />
                    <span>source: {h.source_type}</span>
                    <span>· confidence: </span>
                    {h.confidence_score?.toFixed?.(2) ?? h.confidence_score}
                  </div>
                  {typeof h.metadata?.ingest_confidence === 'number' ? (
                    <div className="text-xs text-muted-foreground">
                      ingest_confidence (metadata): {Number(h.metadata.ingest_confidence).toFixed(2)}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No queued ingestion items for this filter.
        </p>
      ) : null}
    </AppShell>
  )
}
