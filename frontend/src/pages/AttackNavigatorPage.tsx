/**
 * In-app ATT&CK Navigator heatmap.
 *
 * Renders a filterable matrix view using data from:
 *   GET /api/v1/attack/catalog/tactics  (with techniques)
 *   GET /api/v1/attack/navigator-layer  (hypothesis scores per mitre_id)
 *
 * Cell colour intensity driven by score (count of hypotheses mapped).
 */
import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { ThmpCard } from '@/components/thmp/ThmpCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch, downloadNavigatorLayerJson, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'

type Technique = {
  id: string
  mitre_id: string
  name: string
  is_subtechnique: boolean
  parent_technique_id: string | null
}

type Tactic = {
  id: string
  short_name: string
  name: string
  techniques: Technique[]
}

type LayerTechnique = {
  techniqueID: string
  score: number
  comment: string
}

type LayerData = {
  techniques: LayerTechnique[]
}

const SEVERITIES = ['all', 'informational', 'low', 'medium', 'high', 'critical']
const STATUSES = ['all', 'draft', 'active', 'in_hunt', 'validated', 'closed', 'archived']

function intensityClass(score: number, max: number, isGap: boolean): string {
  if (isGap) return 'border border-dashed border-[var(--sev-critical)] bg-[var(--cov-gap)]'
  if (score === 0 || max === 0) return 'border border-border bg-[var(--cov-0)]'
  const ratio = score / max
  if (ratio < 0.25) return 'bg-[var(--cov-1)]'
  if (ratio < 0.5) return 'bg-[var(--cov-2)]'
  if (ratio < 0.75) return 'bg-[var(--cov-3)]'
  return 'bg-[var(--cov-4)]'
}

export function AttackNavigatorPage() {
  const { user } = useAuth()
  const workspaceId = getWorkspaceId() || ''
  const workspaceRole = user?.workspaces.find((w) => w.id === workspaceId)?.role ?? null

  const [tactics, setTactics] = useState<Tactic[]>([])
  const [scoreMap, setScoreMap] = useState<Record<string, { score: number; comment: string }>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [maxScore, setMaxScore] = useState(1)

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [navError, setNavError] = useState<string | null>(null)
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null)

  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    setLoading(true)
    setError(null)
    try {
      // Build query params for layer based on filters
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterSeverity !== 'all') params.set('severity', filterSeverity)

      const [tacticsData, layerData] = await Promise.all([
        apiFetch('/api/v1/attack/catalog/tactics') as Promise<Tactic[]>,
        apiFetch(`/api/v1/attack/navigator-layer?${params.toString()}`) as Promise<LayerData>,
      ])

      setTactics(Array.isArray(tacticsData) ? tacticsData : [])

      const sm: Record<string, { score: number; comment: string }> = {}
      let mx = 0
      for (const t of (layerData?.techniques ?? [])) {
        sm[t.techniqueID] = { score: t.score, comment: t.comment }
        if (t.score > mx) mx = t.score
      }
      setScoreMap(sm)
      setMaxScore(mx || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterSeverity])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount / filter fetch
    void load()
  }, [load])

  function onExport() {
    setNavError(null)
    void downloadNavigatorLayerJson().catch((err) =>
      setNavError(err instanceof Error ? err.message : 'Export failed'),
    )
  }

  const coveredCount = Object.values(scoreMap).filter((v) => v.score > 0).length
  const totalTechniques = tactics.reduce((s, t) => s + t.techniques.length, 0)
  const selectedScore = selectedTechnique ? scoreMap[selectedTechnique.mitre_id] : null

  return (
    <AppShell workspaceRole={workspaceRole} onWorkspaceChange={() => void load()} layout="full">
      <PageHeader
        title="ATT&CK Navigator"
        subtitle={`Coverage heatmap — ${coveredCount} of ${totalTechniques} techniques covered.`}
        actions={
          <>
          <Button type="button" variant="outline" size="sm" onClick={onExport}>
            Export layer JSON
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
          </>
        }
      />

      {navError ? <p className="mb-3 text-sm text-destructive">{navError}</p> : null}

      <ThmpCard className="mb-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">Severity</Label>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Coverage:</span>
            <span className="inline-block h-3 w-6 rounded border border-border bg-[var(--cov-0)]" /> None
            <span className="inline-block h-3 w-6 rounded bg-[var(--cov-1)]" /> Low
            <span className="inline-block h-3 w-6 rounded bg-[var(--cov-2)]" /> Med
            <span className="inline-block h-3 w-6 rounded bg-[var(--cov-3)]" /> High
            <span className="inline-block h-3 w-6 rounded bg-[var(--cov-4)]" /> Max
            <span className="inline-block h-3 w-6 rounded border border-dashed border-[var(--sev-critical)] bg-[var(--cov-gap)]" /> Gap
          </div>
        </div>
      </ThmpCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <ThmpCard>
          <div className="overflow-x-auto">
            <div className="inline-flex gap-2 pb-4" style={{ minWidth: 'max-content' }}>
              {tactics.map((tactic) => (
                <div key={tactic.id} className="flex w-40 flex-col gap-1">
                  <div className="rounded-t-md bg-[var(--primary)] px-2 py-1 text-center text-xs font-semibold text-primary-foreground truncate" title={tactic.name}>
                    {tactic.name}
                  </div>
                  {tactic.techniques.map((tech) => {
                    const entry = scoreMap[tech.mitre_id]
                    const score = entry?.score ?? 0
                    const comment = entry?.comment ?? ''
                    const isGap = score === 0 && !tech.is_subtechnique
                    return (
                      <button
                        type="button"
                        key={tech.id}
                        title={`${tech.mitre_id} — ${tech.name}${score > 0 ? `\n${score} hypotheses\n${comment}` : ''}`}
                        className={cn(
                          'rounded px-1.5 py-1 text-left text-xs transition-colors cursor-pointer',
                          intensityClass(score, maxScore, isGap),
                          tech.is_subtechnique ? 'ml-2 text-[10px]' : 'font-medium',
                          selectedTechnique?.id === tech.id && 'ring-1 ring-primary',
                        )}
                        onClick={() => setSelectedTechnique(tech)}
                      >
                        <div className="truncate">{tech.mitre_id}</div>
                        <div className="truncate text-[10px] opacity-80">{tech.name}</div>
                        <div className="mt-0.5 text-[10px] font-semibold">{score > 0 ? `${score} mapped` : isGap ? 'gap' : 'none'}</div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </ThmpCard>
        <ThmpCard title="Technique Details" contentClassName="space-y-2">
          {!selectedTechnique ? (
            <p className="text-sm text-muted-foreground">Select a technique to inspect mapped hypotheses and notes.</p>
          ) : (
            <>
              <p className="font-mono text-xs text-primary">{selectedTechnique.mitre_id}</p>
              <p className="text-sm text-foreground">{selectedTechnique.name}</p>
              <p className="text-xs text-muted-foreground">
                Score: <span className="font-mono text-foreground">{selectedScore?.score ?? 0}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedScore?.score
                  ? 'Technique covered by active mappings.'
                  : 'Gap candidate: no active mapping score for selected filters.'}
              </p>
              {selectedScore?.comment ? (
                <p className="whitespace-pre-wrap rounded border border-sidebar-border bg-muted/40 p-2 text-xs text-muted-foreground">
                  {selectedScore.comment}
                </p>
              ) : null}
            </>
          )}
        </ThmpCard>
      </div>

      {!loading && tactics.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No ATT&CK data. Ask a workspace admin to run{' '}
          <code className="text-xs">POST /api/v1/attack/sync</code> first.
        </p>
      ) : null}
    </AppShell>
  )
}
