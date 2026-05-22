import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
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
import {
  ApiError,
  apiFetch,
  downloadEvidenceFile,
  getWorkspaceId,
  parseConflictCurrent,
  uploadEvidenceFile,
} from '@/api'
import { useAuth } from '@/auth/AuthContext'
import { MentionTextarea } from '@/components/MentionTextarea'
import { ScreenshotAnnotator } from '@/components/ScreenshotAnnotator'
import { TechniqueTypeahead, type TechniqueEntry, type TechniqueSummary } from '@/components/TechniqueTypeahead'
import { SeverityBadge, StatusBadge } from '@/components/ThreatBadges'
import { renderCommentMentions } from '@/lib/renderCommentMentions'

const STATUSES = ['draft', 'active', 'in_hunt', 'validated', 'closed', 'archived'] as const
const SEVERITIES = ['informational', 'low', 'medium', 'high', 'critical'] as const
const EVID_TYPES = ['note', 'log_snippet', 'ioc', 'siem_query', 'file', 'screenshot', 'network_capture'] as const

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
  analyst_confidence_1_5?: number | null
  signal_strength_0_1?: number | null
}

type ActivityRow = {
  id: string
  occurred_at: string
  kind: string
  summary: string
  actor_id: string | null
  detail: string | null
}

type CommentRow = {
  id: string
  body: string
  author_id: string
  created_at: string
}

type WorkspaceMemberPick = { id: string; display_name: string; email: string }

type EvidenceRow = {
  id: string
  type: string
  title: string
  version: number
  created_at: string
  iocs?: unknown[] | null
  storage_key?: string | null
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
  const canManageScoring = role === 'manager' || role === 'admin'
  const canWrite =
    role != null && ['analyst', 'hunt_lead', 'ti_analyst', 'manager', 'admin'].includes(role)

  const [h, setH] = useState<HypothesisDetail | null>(null)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])
  const [evidence, setEvidence] = useState<EvidenceRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<string>('medium')
  const [confidence, setConfidence] = useState(0) // display-only (server composite)
  const [analystConf, setAnalystConf] = useState<number | ''>('')
  const [signalStr, setSignalStr] = useState<number | ''>('')
  const [status, setStatus] = useState<string>('draft')
  const [transitionComment, setTransitionComment] = useState('')
  const [techniqueEntries, setTechniqueEntries] = useState<TechniqueEntry[]>([])

  const [commentBody, setCommentBody] = useState('')
  const [evTitle, setEvTitle] = useState('')
  const [evType, setEvType] = useState<string>('note')
  const [evContent, setEvContent] = useState('')
  const [evAutoIoc, setEvAutoIoc] = useState(true)
  const [evSiemVendor, setEvSiemVendor] = useState('')
  const [evSiemUrl, setEvSiemUrl] = useState('')
  const [evSiemQuery, setEvSiemQuery] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [annotInitial, setAnnotInitial] = useState<File | null>(null)
  const [members, setMembers] = useState<WorkspaceMemberPick[]>([])
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentBody, setEditingCommentBody] = useState('')

  const [weights, setWeights] = useState({ analyst: 0.4, evidence: 0.4, signal: 0.2 })

  type SuggestHit = { technique_id: string; label: string; score: number }
  const [suggestions, setSuggestions] = useState<SuggestHit[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadEvidenceCommentsActivity = useCallback(async () => {
    if (!id || !ws) return
    try {
      const [act, comm, ev] = await Promise.all([
        apiFetch(`/api/v1/hypotheses/${id}/activity`) as Promise<ActivityRow[]>,
        apiFetch(`/api/v1/hypotheses/${id}/comments`) as Promise<CommentRow[]>,
        apiFetch(`/api/v1/evidence?hypothesis_id=${encodeURIComponent(id)}`) as Promise<EvidenceRow[]>,
      ])
      setActivity(Array.isArray(act) ? act : [])
      setComments(Array.isArray(comm) ? comm : [])
      setEvidence(Array.isArray(ev) ? ev : [])
    } catch {
      /* ignore secondary load errors */
    }
  }, [id, ws])

  const loadScoring = useCallback(async () => {
    if (!ws || !canManageScoring) return
    try {
      const s = (await apiFetch('/api/v1/workspace/scoring')) as { weights: Record<string, number> }
      if (s.weights) {
        setWeights({
          analyst: s.weights.analyst ?? 0.4,
          evidence: s.weights.evidence ?? 0.4,
          signal: s.weights.signal ?? 0.2,
        })
      }
    } catch {
      /* optional */
    }
  }, [ws, canManageScoring])

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
      setAnalystConf(data.analyst_confidence_1_5 ?? '')
      setSignalStr(data.signal_strength_0_1 ?? '')
      setStatus(data.status)
      setTransitionComment('')
      const rawIds = (data.attack_technique_ids || []).map(String)
      try {
        setTechniqueEntries(await resolveTechniqueEntries(rawIds))
      } catch {
        setTechniqueEntries(rawIds.map((i) => ({ id: i, label: i.slice(0, 8) + '…' })))
      }
      await loadEvidenceCommentsActivity()
      await loadScoring()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setH(null)
    }
  }, [id, ws, loadEvidenceCommentsActivity, loadScoring])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  useEffect(() => {
    if (!ws) return
    void apiFetch(`/api/v1/workspaces/${ws}/members`)
      .then((rows) => {
        setMembers(Array.isArray(rows) ? (rows as WorkspaceMemberPick[]) : [])
      })
      .catch(() => setMembers([]))
  }, [ws])

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
        attack_technique_ids: techniqueEntries.map((e) => e.id),
        skip_scoring_recompute: false,
      }
      if (analystConf !== '') body.analyst_confidence_1_5 = analystConf
      if (signalStr !== '') body.signal_strength_0_1 = signalStr
      if (status !== h.status) {
        body.status = status
        body.transition_comment = transitionComment.trim()
      }
      const updated = (await apiFetch(`/api/v1/hypotheses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        ifMatch: h.updated_at,
      })) as HypothesisDetail
      setH(updated)
      setStatus(updated.status)
      setConfidence(updated.confidence_score)
      setTransitionComment('')
      await loadEvidenceCommentsActivity()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const cur = parseConflictCurrent(err.rawBody)
        if (cur && typeof cur === 'object') {
          setH(cur as unknown as HypothesisDetail)
          setError('Someone else edited this hypothesis. Form was refreshed from server.')
          void load()
          return
        }
      }
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

  async function onAddComment(e: FormEvent) {
    e.preventDefault()
    if (!id || !commentBody.trim()) return
    setError(null)
    try {
      await apiFetch(`/api/v1/hypotheses/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: commentBody.trim() }),
      })
      setCommentBody('')
      await loadEvidenceCommentsActivity()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed')
    }
  }

  async function onAddEvidence(e: FormEvent) {
    e.preventDefault()
    if (!id || !evTitle.trim()) return
    setError(null)
    try {
      await apiFetch('/api/v1/evidence', {
        method: 'POST',
        body: JSON.stringify({
          hypothesis_id: id,
          type: evType,
          title: evTitle.trim(),
          content: evContent || null,
          auto_extract_iocs: evAutoIoc,
          siem_vendor: evSiemVendor || null,
          siem_query_url: evSiemUrl || null,
          siem_query_text: evSiemQuery || null,
        }),
      })
      setEvTitle('')
      setEvContent('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evidence failed')
    }
  }

  async function onUploadEvidence(e: FormEvent) {
    e.preventDefault()
    if (!id || !uploadFile) return
    setError(null)
    try {
      await uploadEvidenceFile(id, uploadFile.name || 'upload', uploadFile)
      setUploadFile(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  function canEditComment(c: CommentRow): boolean {
    if (!user) return false
    if (role === 'manager' || role === 'admin') return true
    return c.author_id === user.id
  }

  async function onSaveCommentEdit(e: FormEvent) {
    e.preventDefault()
    if (!id || !editingCommentId || !editingCommentBody.trim()) return
    setError(null)
    try {
      await apiFetch(`/api/v1/hypotheses/${id}/comments/${editingCommentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: editingCommentBody.trim() }),
      })
      setEditingCommentId(null)
      setEditingCommentBody('')
      await loadEvidenceCommentsActivity()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update comment failed')
    }
  }

  async function onSaveScoring(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await apiFetch('/api/v1/workspace/scoring', {
        method: 'PATCH',
        body: JSON.stringify({ weights }),
      })
      setError(null)
      await loadScoring()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scoring save failed')
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
        <div className="max-w-3xl space-y-10">
          <form onSubmit={onSave} className="space-y-4">
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
                <Label htmlFor="hyp-confidence">Confidence (0–1, composite)</Label>
                <p id="hyp-confidence" className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  {confidence.toFixed(3)} — updated from analyst rating, evidence, and signal strength
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hyp-analyst">Analyst confidence (1–5)</Label>
                <Input
                  id="hyp-analyst"
                  type="number"
                  min={1}
                  max={5}
                  value={analystConf}
                  onChange={(e) => setAnalystConf(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hyp-signal">Signal strength (0–1)</Label>
                <Input
                  id="hyp-signal"
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={signalStr}
                  onChange={(e) => setSignalStr(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>
            <TechniqueTypeahead
              entries={techniqueEntries}
              onChange={setTechniqueEntries}
              disabled={saving}
            />

            {/* ATT&CK auto-suggestions from sentence-transformer sidecar */}
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ATT&CK suggestions</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={suggestLoading || !description.trim()}
                  onClick={() => {
                    if (suggestDebounce.current) clearTimeout(suggestDebounce.current)
                    const text = `${title} ${description}`.trim()
                    if (!text) return
                    setSuggestLoading(true)
                    void apiFetch(`/api/v1/attack/suggest?text=${encodeURIComponent(text)}&top_k=5`)
                      .then((data) => {
                        setSuggestions(Array.isArray(data) ? (data as SuggestHit[]) : [])
                      })
                      .catch(() => {})
                      .finally(() => setSuggestLoading(false))
                  }}
                >
                  {suggestLoading ? 'Suggesting…' : 'Suggest from text'}
                </Button>
              </div>
              {suggestions.length > 0 ? (
                <ul className="space-y-1">
                  {suggestions.map((s) => {
                    const alreadyAdded = techniqueEntries.some((e) => e.id === s.technique_id)
                    const rejected = rejectedIds.has(s.technique_id)
                    if (rejected) return null
                    return (
                      <li key={s.technique_id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">
                          <span className="font-mono">{s.label}</span>
                          <span className="ml-1 text-muted-foreground">({(s.score * 100).toFixed(0)}%)</span>
                        </span>
                        <div className="flex gap-1 shrink-0">
                          {alreadyAdded ? (
                            <span className="text-muted-foreground">Added</span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                setTechniqueEntries((prev) => [
                                  ...prev,
                                  { id: s.technique_id, label: s.label },
                                ])
                              }}
                            >
                              Accept
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              setRejectedIds((prev) => new Set([...prev, s.technique_id]))
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Click "Suggest from text" to get technique suggestions based on the description.
                </p>
              )}
            </div>
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
              Current: <StatusBadge value={h.status} className="align-middle" />{' '}
              <SeverityBadge value={h.severity} className="align-middle" /> · Owner {h.owner_id.slice(0, 8)}… · Updated{' '}
              {new Date(h.updated_at).toLocaleString()}
              <br />
              Mention teammates with <code className="text-xs">@[name](user:uuid)</code> (picker) or legacy{' '}
              <code className="text-xs">@uuid</code>.
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

          {canManageScoring ? (
            <section>
              <h2 className="mb-3 text-lg font-medium">Workspace scoring weights</h2>
              <form onSubmit={onSaveScoring} className="grid max-w-md gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Analyst</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={weights.analyst}
                    onChange={(e) => setWeights((w) => ({ ...w, analyst: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Evidence</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={weights.evidence}
                    onChange={(e) => setWeights((w) => ({ ...w, evidence: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Signal</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={weights.signal}
                    onChange={(e) => setWeights((w) => ({ ...w, signal: Number(e.target.value) }))}
                  />
                </div>
                <Button type="submit" className="sm:col-span-3">
                  Save weights
                </Button>
              </form>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-lg font-medium">Activity</h2>
            <ul className="space-y-2 text-sm">
              {activity.map((a) => (
                <li key={`${a.kind}-${a.id}`} className="rounded border border-border px-3 py-2">
                  <span className="text-muted-foreground">
                    {new Date(a.occurred_at).toLocaleString()} · {a.kind}
                  </span>
                  <p className="font-medium">{a.summary}</p>
                  {a.detail ? <p className="mt-1 text-muted-foreground">{a.detail}</p> : null}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium">Comments</h2>
            <ul className="mb-4 space-y-2 text-sm">
              {comments.map((c) => (
                <li key={c.id} className="rounded border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()} · {c.author_id.slice(0, 8)}…
                    </span>
                    {editingCommentId !== c.id && canWrite && canEditComment(c) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingCommentId(c.id)
                          setEditingCommentBody(c.body)
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                  </div>
                  {editingCommentId === c.id ? (
                    <form className="mt-2 space-y-2" onSubmit={(ev) => void onSaveCommentEdit(ev)}>
                      <MentionTextarea
                        className="min-h-20"
                        value={editingCommentBody}
                        onChange={setEditingCommentBody}
                        members={members}
                        required
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCommentId(null)
                            setEditingCommentBody('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{renderCommentMentions(c.body)}</p>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={onAddComment} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="new-comment">New comment</Label>
                <MentionTextarea
                  id="new-comment"
                  value={commentBody}
                  onChange={setCommentBody}
                  members={members}
                  placeholder="Threaded discussion; type @ for mentions"
                  className="min-h-20"
                />
              </div>
              <Button type="submit">Post</Button>
            </form>
          </section>

          <section id="evidence">
            <h2 className="mb-3 text-lg font-medium">Evidence</h2>
            <ul className="mb-4 space-y-2 text-sm">
              {evidence.map((ev) => (
                <li key={ev.id} className="rounded border border-border px-3 py-2">
                  <span className="font-medium">
                    {ev.title}
                  </span>{' '}
                  <span className="text-muted-foreground">
                    ({ev.type} v{ev.version})
                  </span>
                  {ev.storage_key && (ev.type === 'file' || ev.type === 'screenshot') ? (
                    <button
                      type="button"
                      className="ml-2 text-sm text-primary underline-offset-2 hover:underline"
                      onClick={() => {
                        const safe = (ev.title || 'evidence').replace(/[^\w.-]+/g, '_')
                        void downloadEvidenceFile(ev.id, safe)
                      }}
                    >
                      Download
                    </button>
                  ) : null}
                  {ev.iocs && Array.isArray(ev.iocs) && ev.iocs.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      IOCs: {ev.iocs.length} extracted
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <form onSubmit={onAddEvidence} className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Add evidence</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={evType} onValueChange={setEvType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVID_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Content</Label>
                <Textarea value={evContent} onChange={(e) => setEvContent(e.target.value)} className="min-h-24" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>SIEM vendor</Label>
                  <Input value={evSiemVendor} onChange={(e) => setEvSiemVendor(e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>SIEM query URL</Label>
                  <Input value={evSiemUrl} onChange={(e) => setEvSiemUrl(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>SIEM query text</Label>
                <Textarea value={evSiemQuery} onChange={(e) => setEvSiemQuery(e.target.value)} className="min-h-16" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={evAutoIoc}
                  onChange={(e) => setEvAutoIoc(e.target.checked)}
                />
                Auto-extract IOCs from content
              </label>
              <Button type="submit">Add evidence</Button>
            </form>
            <form onSubmit={onUploadEvidence} className="mt-4 space-y-2 rounded-lg border border-dashed border-border p-4">
              <p className="text-sm font-medium">Upload file</p>
              <Input
                type="file"
                onChange={(e) => {
                  setUploadFile(e.target.files?.[0] ?? null)
                  setAnnotInitial(null)
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!uploadFile}>
                  Upload
                </Button>
                {uploadFile?.type.startsWith('image/') ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setAnnotInitial(uploadFile)}
                  >
                    Annotate before upload
                  </Button>
                ) : null}
              </div>
            </form>
            {canWrite && id ? (
              <ScreenshotAnnotator
                key={annotInitial?.name ?? 'scratch'}
                disabled={saving}
                initialFile={annotInitial}
                onExport={async (file, t, annotations) => {
                  if (!id) return
                  setError(null)
                  try {
                    await uploadEvidenceFile(id, t, file, {
                      metadata: { annotations, annotator_version: 1 },
                    })
                    setAnnotInitial(null)
                    await load()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Annotated upload failed')
                  }
                }}
              />
            ) : null}
          </section>
        </div>
      )}
    </AppShell>
  )
}
