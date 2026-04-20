import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { AppShell } from '@/components/AppShell'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'
import { TechniqueTypeahead, type TechniqueEntry, type TechniqueSummary } from '@/components/TechniqueTypeahead'

const STATUSES = ['draft', 'active', 'in_hunt', 'validated', 'closed', 'archived'] as const
const SEVERITIES = ['informational', 'low', 'medium', 'high', 'critical'] as const

type HypothesisDetail = {
  id: string
  title: string
  description: string
  status: string
  confidence_score: number
  severity: string
  owner_id: string
  workspace_id: string
  source_type: string
  created_by: string
  created_at: string
  updated_at: string
  closed_at: string | null
  attack_technique_ids?: string[] | null
}

async function resolveTechniqueEntries(ids: string[]): Promise<TechniqueEntry[]> {
  if (!ids.length) return []
  const qs = encodeURIComponent(ids.join(','))
  const data = (await apiFetch(`/api/v1/attack/techniques?ids=${qs}`)) as TechniqueSummary[]
  if (!Array.isArray(data)) return ids.map((id) => ({ id, label: id }))
  const byId = new Map(data.map((s) => [s.id, s]))
  return ids.map((id) => {
    const s = byId.get(id)
    if (!s) return { id, label: id.slice(0, 8) + '…' }
    return {
      id,
      label: `${s.mitre_id} — ${s.name}${s.is_subtechnique ? ' (sub)' : ''}`,
    }
  })
}

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

export function HypothesisDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null
  const canDelete = role === 'manager' || role === 'admin'

  const [h, setH] = useState<HypothesisDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<string>('medium')
  const [confidence, setConfidence] = useState(0)
  const [status, setStatus] = useState<string>('draft')
  const [transitionComment, setTransitionComment] = useState('')
  const [techniqueEntries, setTechniqueEntries] = useState<TechniqueEntry[]>([])

  const load = useCallback(async () => {
    if (!id || !ws) return
    setError(null)
    try {
      const data = (await apiFetch(`/api/v1/hypotheses/${id}`)) as HypothesisDetail
      setH(data)
      setTitle(data.title)
      setDescription(data.description)
      setSeverity(data.severity)
      setConfidence(data.confidence_score)
      setStatus(data.status)
      setTransitionComment('')
      const rawIds = (data.attack_technique_ids || []).map(String)
      try {
        setTechniqueEntries(await resolveTechniqueEntries(rawIds))
      } catch {
        setTechniqueEntries(rawIds.map((i) => ({ id: i, label: i.slice(0, 8) + '…' })))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setH(null)
    }
  }, [id, ws])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!id || !h) return
    if (status !== h.status && !transitionComment.trim()) {
      setError('A transition comment is required when changing status.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title,
        description,
        severity,
        confidence_score: confidence,
        attack_technique_ids: techniqueEntries.map((e) => e.id),
      }
      if (status !== h.status) {
        body.status = status
        body.transition_comment = transitionComment.trim()
      }
      const updated = (await apiFetch(`/api/v1/hypotheses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })) as HypothesisDetail
      setH(updated)
      setStatus(updated.status)
      setTransitionComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!id || !canDelete) return
    if (!confirm('Delete this hypothesis permanently?')) return
    setError(null)
    try {
      await apiFetch(`/api/v1/hypotheses/${id}`, { method: 'DELETE' })
      nav('/hypotheses')
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

  if (!id) {
    return <p className="p-8 text-muted-foreground">Invalid hypothesis.</p>
  }

  return (
    <AppShell workspaceRole={role} onWorkspaceChange={() => void load()}>
      <header className="mb-6">
        <Link to="/hypotheses" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Hypotheses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Hypothesis</h1>
      </header>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {!h ? (
        <p className="text-muted-foreground">{error ? '' : 'Loading…'}</p>
      ) : (
        <form onSubmit={onSave} className="max-w-3xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hyp-title">Title</Label>
            <Input
              id="hyp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={256}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hyp-desc">Description</Label>
            <Textarea
              id="hyp-desc"
              className="min-h-32"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hyp-severity">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger id="hyp-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hyp-confidence">Confidence (0–1)</Label>
              <Input
                id="hyp-confidence"
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
              />
            </div>
          </div>
          <TechniqueTypeahead
            entries={techniqueEntries}
            onChange={setTechniqueEntries}
            disabled={saving}
          />
          <div className="space-y-2">
            <Label htmlFor="hyp-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="hyp-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {status !== h.status ? (
            <div className="space-y-2">
              <Label htmlFor="hyp-transition">Transition comment (required)</Label>
              <Textarea
                id="hyp-transition"
                className="min-h-24"
                value={transitionComment}
                onChange={(e) => setTransitionComment(e.target.value)}
                placeholder="Why is this status change justified?"
                required
              />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Current: {h.status} · Owner {h.owner_id.slice(0, 8)}… · Updated{' '}
            {new Date(h.updated_at).toLocaleString()}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            {canDelete ? (
              <Button type="button" variant="destructive" onClick={() => void onDelete()}>
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </AppShell>
  )
}
