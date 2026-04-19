import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch, getWorkspaceId } from '../api'
import { useAuth } from '../auth/AuthContext'

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
  const { user, logout } = useAuth()
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setH(null)
    }
  }, [id, ws])

  useEffect(() => {
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
        <Link to="/login" className="text-thmp-accent hover:underline">
          Sign in
        </Link>
      </div>
    )
  }

  if (!id) {
    return <p className="p-8 text-thmp-muted">Invalid hypothesis.</p>
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-left">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/hypotheses" className="text-sm text-thmp-accent hover:underline">
            ← Hypotheses
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Hypothesis</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border border-thmp-border px-3 py-1 text-sm hover:bg-thmp-border/30"
          >
            Log out
          </button>
        </div>
      </header>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      {!h ? (
        <p className="text-thmp-muted">{error ? '' : 'Loading…'}</p>
      ) : (
        <form onSubmit={onSave} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-thmp-muted">Title</span>
            <input
              className="rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={256}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-thmp-muted">Description</span>
            <textarea
              className="min-h-32 rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-thmp-muted">Severity</span>
              <select
                className="rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-thmp-muted">Confidence (0–1)</span>
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                className="rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-thmp-muted">Status</span>
            <select
              className="rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {status !== h.status ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-thmp-muted">Transition comment (required)</span>
              <textarea
                className="min-h-24 rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
                value={transitionComment}
                onChange={(e) => setTransitionComment(e.target.value)}
                placeholder="Why is this status change justified?"
                required
              />
            </label>
          ) : null}
          <p className="text-xs text-thmp-muted">
            Current: {h.status} · Owner {h.owner_id.slice(0, 8)}… · Updated {new Date(h.updated_at).toLocaleString()}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-thmp-accent px-4 py-2 font-medium text-white hover:bg-thmp-accent-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {canDelete ? (
              <button
                type="button"
                onClick={() => void onDelete()}
                className="rounded-md border border-red-500/60 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                Delete
              </button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  )
}
