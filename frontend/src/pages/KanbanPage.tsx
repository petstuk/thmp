import { useCallback, useEffect, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { ThmpCard } from '@/components/thmp/ThmpCard'
import { UserAvatar } from '@/components/thmp/UserAvatar'
import { SeverityBadge, StatusBadge } from '@/components/ThreatBadges'
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
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

const COLUMNS = ['draft', 'active', 'in_hunt', 'validated', 'closed', 'archived'] as const
type Status = (typeof COLUMNS)[number]

type HypCard = {
  id: string
  title: string
  status: string
  severity: string
  owner_id: string
  attack_technique_ids?: string[] | null
}

type HuntRow = { id: string; name: string }

type Preset = { id: string; name: string; filters: Record<string, unknown> }

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

function buildQuery(filters: {
  ownerId: string
  severity: string
  sourceType: string
  huntId: string
  createdAfter: string
  createdBefore: string
}): string {
  const q = new URLSearchParams()
  if (filters.ownerId.trim()) q.set('owner_id', filters.ownerId.trim())
  if (filters.severity && filters.severity !== '_any') q.set('severity', filters.severity)
  if (filters.sourceType && filters.sourceType !== '_any') q.set('source_type', filters.sourceType)
  if (filters.huntId && filters.huntId !== '_none') q.set('hunt_id', filters.huntId)
  if (filters.createdAfter.trim()) {
    const t = new Date(filters.createdAfter)
    if (!Number.isNaN(t.getTime())) q.set('created_after', t.toISOString())
  }
  if (filters.createdBefore.trim()) {
    const t = new Date(filters.createdBefore)
    if (!Number.isNaN(t.getTime())) q.set('created_before', t.toISOString())
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

function parseTechniqueFilter(raw: string): Set<string> {
  const s = new Set<string>()
  for (const part of raw.split(/[\s,]+/)) {
    const p = part.trim()
    if (p) s.add(p)
  }
  return s
}

export function KanbanPage() {
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null
  const canWrite =
    role != null && ['analyst', 'hunt_lead', 'ti_analyst', 'manager', 'admin'].includes(role)

  const [items, setItems] = useState<HypCard[]>([])
  const [hunts, setHunts] = useState<HuntRow[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState('')
  const [severity, setSeverity] = useState('_any')
  const [sourceType, setSourceType] = useState('_any')
  const [huntId, setHuntId] = useState('_none')
  const [createdAfter, setCreatedAfter] = useState('')
  const [createdBefore, setCreatedBefore] = useState('')
  const [techniqueFilter, setTechniqueFilter] = useState('')
  const [presetName, setPresetName] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!ws) return
    setError(null)
    try {
      const q = buildQuery({ ownerId, severity, sourceType, huntId, createdAfter, createdBefore })
      const [hyps, huntList, presetList] = await Promise.all([
        apiFetch(`/api/v1/hypotheses${q}`) as Promise<HypCard[]>,
        apiFetch('/api/v1/hunts') as Promise<HuntRow[]>,
        apiFetch('/api/v1/kanban/presets') as Promise<Preset[]>,
      ])
      setItems(Array.isArray(hyps) ? hyps : [])
      setHunts(Array.isArray(huntList) ? huntList : [])
      setPresets(Array.isArray(presetList) ? presetList : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load board')
      setItems([])
    }
  }, [ws, ownerId, severity, sourceType, huntId, createdAfter, createdBefore])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  async function applyPreset(p: Preset) {
    const f = p.filters as {
      ownerId?: string
      severity?: string
      sourceType?: string
      huntId?: string
      createdAfter?: string
      createdBefore?: string
      techniqueFilter?: string
    }
    setOwnerId(f.ownerId ?? '')
    setSeverity(f.severity ?? '_any')
    setSourceType(f.sourceType ?? '_any')
    setHuntId(f.huntId ?? '_none')
    setCreatedAfter(f.createdAfter ?? '')
    setCreatedBefore(f.createdBefore ?? '')
    setTechniqueFilter(f.techniqueFilter ?? '')
  }

  async function savePreset() {
    if (!presetName.trim()) return
    try {
      await apiFetch('/api/v1/kanban/presets', {
        method: 'POST',
        body: JSON.stringify({
          name: presetName.trim(),
          filters: {
            ownerId,
            severity,
            sourceType,
            huntId,
            createdAfter,
            createdBefore,
            techniqueFilter,
          },
        }),
      })
      setPresetName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save preset failed')
    }
  }

  async function deletePreset(id: string) {
    try {
      await apiFetch(`/api/v1/kanban/presets/${id}`, { method: 'DELETE' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  async function moveCard(hypothesisId: string, toStatus: Status) {
    if (!canWrite) return
    const card = items.find((x) => x.id === hypothesisId)
    if (!card || card.status === toStatus) return
    try {
      await apiFetch(`/api/v1/hypotheses/${hypothesisId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: toStatus,
          transition_comment: 'Moved via Hunt board',
        }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status change not allowed')
    }
  }

  function onDragStart(id: string) {
    setDragId(id)
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
  }

  function onDropColumn(e: DragEvent, col: Status) {
    e.preventDefault()
    const id = dragId || e.dataTransfer.getData('text/plain')
    setDragId(null)
    if (id) void moveCard(id, col)
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

  const selectedTechs = parseTechniqueFilter(techniqueFilter)
  const visibleItems =
    selectedTechs.size === 0
      ? items
      : items.filter((c) => {
          const t = c.attack_technique_ids
          if (!t || t.length === 0) return false
          return t.some((x) => selectedTechs.has(x))
        })

  return (
    <AppShell workspaceRole={role} onWorkspaceChange={() => void load()} layout="full">
      <PageHeader
        title="Hunt Board"
        subtitle="Drag cards between columns to transition hypotheses (valid FSM rules apply)."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <ThmpCard className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="kb-owner">Owner ID</Label>
            <Input
              id="kb-owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              placeholder="UUID filter"
            />
          </div>
          <div className="space-y-1">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any</SelectItem>
                <SelectItem value="informational">informational</SelectItem>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="medium">medium</SelectItem>
                <SelectItem value="high">high</SelectItem>
                <SelectItem value="critical">critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any</SelectItem>
                <SelectItem value="manual">manual</SelectItem>
                <SelectItem value="intel_feed">intel_feed</SelectItem>
                <SelectItem value="integration">integration</SelectItem>
                <SelectItem value="siem">siem</SelectItem>
                <SelectItem value="scm">scm</SelectItem>
                <SelectItem value="vuln_scanner">vuln_scanner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Hunt scope</Label>
            <Select value={huntId} onValueChange={setHuntId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">All hypotheses</SelectItem>
                {hunts.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="kb-created-after">Created after (local)</Label>
            <Input
              id="kb-created-after"
              type="datetime-local"
              value={createdAfter}
              onChange={(e) => setCreatedAfter(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kb-created-before">Created before (local)</Label>
            <Input
              id="kb-created-before"
              type="datetime-local"
              value={createdBefore}
              onChange={(e) => setCreatedBefore(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="kb-technique">ATT&amp;CK technique IDs (any match, comma- or space-separated)</Label>
            <Input
              id="kb-technique"
              value={techniqueFilter}
              onChange={(e) => setTechniqueFilter(e.target.value)}
              placeholder="e.g. uuid from hypothesis techniques"
            />
            <p className="text-xs text-muted-foreground">
              Filters the loaded board client-side. Leave empty to show all.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <Label htmlFor="kb-preset-name">Save view as</Label>
            <Input
              id="kb-preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => void savePreset()}>
            Save preset
          </Button>
        </div>
        {presets.length > 0 ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-muted-foreground">Saved:</span>
            {presets.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={() => void applyPreset(p)}
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => void deletePreset(p.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </ThmpCard>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className="min-h-[320px] w-72 shrink-0 rounded-lg border border-dashed border-sidebar-border bg-muted/20 p-2"
            onDragOver={onDragOver}
            onDrop={(e) => onDropColumn(e, col)}
          >
            <h2 className="mb-2 flex items-center justify-between border-b border-sidebar-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{col.replace('_', ' ')}</span>
              <span className="rounded-full bg-card px-2 py-0.5 font-mono text-[10px] text-foreground">
                {visibleItems.filter((c) => c.status === col).length}
              </span>
            </h2>
            <ul className="space-y-2">
              {visibleItems
                .filter((c) => c.status === col)
                .map((c) => (
                  <li key={c.id}>
                    <div
                      draggable={canWrite}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', c.id)
                        onDragStart(c.id)
                      }}
                      className="cursor-grab rounded-md border border-sidebar-border bg-card px-3 py-2 text-sm shadow-sm active:cursor-grabbing"
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] text-accent-foreground">
                          {c.id.slice(0, 8)}
                        </span>
                        <SeverityBadge value={c.severity} />
                        <StatusBadge value={c.status} />
                      </div>
                      <Link to={`/hypotheses/${c.id}`} className="font-medium text-foreground underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {c.title}
                      </Link>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <UserAvatar initials={c.owner_id.slice(0, 2)} />
                        <span className="font-mono">{c.owner_id.slice(0, 8)}…</span>
                        <span>· {(c.attack_technique_ids ?? []).length} ATT&CK</span>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
