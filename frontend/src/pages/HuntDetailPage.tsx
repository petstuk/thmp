import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { ThmpCard } from '@/components/thmp/ThmpCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, apiFetch, getWorkspaceId, parseConflictCurrent } from '@/api'
import { useAuth } from '@/auth/AuthContext'
import { StatusBadge } from '@/components/ThreatBadges'

type HuntDetail = {
  id: string
  name: string
  description: string
  status: string
  lead_id: string
  assigned_analyst_ids: string[] | null
  hypothesis_ids: string[] | null
  start_date: string
  end_date: string | null
  workspace_id: string
  created_at: string
  updated_at: string
}

type TimelineRow = {
  id: string
  event_type: string
  message: string
  user_id: string
  created_at: string
}

const HUNT_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

export function HuntDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null
  const canDelete = role === 'manager' || role === 'admin'
  const canWrite =
    role != null && ['analyst', 'hunt_lead', 'ti_analyst', 'manager', 'admin'].includes(role)

  const [hunt, setHunt] = useState<HuntDetail | null>(null)
  const [timeline, setTimeline] = useState<TimelineRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<string>('planned')
  const [transitionComment, setTransitionComment] = useState('')
  const [note, setNote] = useState('')
  const [hypTitles, setHypTitles] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!id || !ws) return
    setError(null)
    try {
      const [h, t, allHyps] = await Promise.all([
        apiFetch(`/api/v1/hunts/${id}`) as Promise<HuntDetail>,
        apiFetch(`/api/v1/hunts/${id}/timeline`) as Promise<TimelineRow[]>,
        apiFetch('/api/v1/hypotheses') as Promise<{ id: string; title: string }[]>,
      ])
      setHunt(h)
      setName(h.name)
      setDescription(h.description)
      setStatus(h.status)
      setTransitionComment('')
      setTimeline(Array.isArray(t) ? t : [])
      const m: Record<string, string> = {}
      for (const row of Array.isArray(allHyps) ? allHyps : []) {
        m[row.id] = row.title
      }
      setHypTitles(m)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hunt')
      setHunt(null)
    }
  }, [id, ws])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!id || !hunt || !canWrite) return
    if (status !== hunt.status && !transitionComment.trim()) {
      setError('A transition comment is required when changing hunt status.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { name, description }
      if (status !== hunt.status) {
        body.status = status
        body.transition_comment = transitionComment.trim()
      }
      const updated = (await apiFetch(`/api/v1/hunts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        ifMatch: hunt.updated_at,
      })) as HuntDetail
      setHunt(updated)
      setStatus(updated.status)
      setTransitionComment('')
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const cur = parseConflictCurrent(err.rawBody)
        if (cur && typeof cur === 'object') {
          setHunt(cur as unknown as HuntDetail)
          setError('This hunt was modified elsewhere; form refreshed from server.')
          await load()
          return
        }
      }
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onAddNote(e: FormEvent) {
    e.preventDefault()
    if (!id || !note.trim() || !canWrite) return
    setError(null)
    try {
      await apiFetch(`/api/v1/hunts/${id}/timeline`, {
        method: 'POST',
        body: JSON.stringify({ body: note.trim() }),
      })
      setNote('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    }
  }

  async function onDelete() {
    if (!id || !canDelete) return
    if (!confirm('Delete this hunt? Findings will be removed.')) return
    try {
      await apiFetch(`/api/v1/hunts/${id}`, { method: 'DELETE' })
      nav('/hunts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
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

  if (!id) return <p className="text-muted-foreground">Invalid hunt.</p>

  return (
    <AppShell workspaceRole={role} onWorkspaceChange={() => void load()}>
      <div className="mb-2">
        <Link to="/hunts" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Hunts
        </Link>
      </div>
      <PageHeader title={hunt?.name ?? 'Hunt'} subtitle="Hunt metadata, linked hypotheses, and timeline." />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {!hunt ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="max-w-3xl space-y-8">
          <ThmpCard>
            <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hunt-name">Name</Label>
              <Input id="hunt-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hunt-desc">Description</Label>
              <Textarea
                id="hunt-desc"
                className="min-h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={!canWrite}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HUNT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {status !== hunt.status ? (
              <div className="space-y-2">
                <Label htmlFor="hunt-trans">Transition comment (required)</Label>
                <Textarea
                  id="hunt-trans"
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  required
                />
              </div>
            ) : null}
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <StatusBadge value={status} />
              Lead {hunt.lead_id.slice(0, 8)}… · Linked hypotheses: {(hunt.hypothesis_ids ?? []).length}
            </p>
            {canWrite ? (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            ) : null}
            {canDelete ? (
              <Button type="button" variant="destructive" className="ml-2" onClick={() => void onDelete()}>
                Delete hunt
              </Button>
            ) : null}
            </form>
          </ThmpCard>

          <ThmpCard title="Linked hypotheses">
            <h2 className="mb-3 text-lg font-medium">Linked hypotheses</h2>
            <ul className="space-y-2">
              {(hunt.hypothesis_ids ?? []).length === 0 ? (
                <li className="text-sm text-muted-foreground">None linked.</li>
              ) : (
                (hunt.hypothesis_ids ?? []).map((hid) => (
                  <li key={hid}>
                    <Link to={`/hypotheses/${hid}`} className="text-primary underline-offset-4 hover:underline">
                      {hypTitles[hid] ?? `${hid.slice(0, 8)}…`}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </ThmpCard>

          <ThmpCard title="Timeline">
            <h2 className="mb-3 text-lg font-medium">Timeline</h2>
            {canWrite ? (
              <form onSubmit={onAddNote} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="hunt-note">Add note</Label>
                  <Input
                    id="hunt-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Timeline note"
                  />
                </div>
                <Button type="submit">Add</Button>
              </form>
            ) : null}
            <ul className="space-y-2 text-sm">
              {timeline.map((ev) => (
                <li key={ev.id} className="rounded-md border border-sidebar-border px-3 py-2">
                  <span className="text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString()} · {ev.event_type}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">{ev.message}</p>
                </li>
              ))}
            </ul>
          </ThmpCard>
        </div>
      )}
    </AppShell>
  )
}
