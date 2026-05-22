import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SupportBadge } from '@/components/ThreatBadges'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch, downloadEvidenceFile, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

const EVID_TYPES = ['file', 'ioc', 'log_snippet', 'siem_query', 'screenshot', 'network_capture', 'note'] as const

type HubRow = {
  id: string
  hypothesis_id: string
  hypothesis_title: string
  type: string
  title: string
  content: string | null
  storage_key: string | null
  supports_hypothesis: boolean
  version: number
  submitted_by: string
  created_at: string
}

type SearchHit = { id: string; type: string; title: string; snippet: string }

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

export function EvidenceHubPage() {
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null
  const [rows, setRows] = useState<HubRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [evType, setEvType] = useState<string>('all')
  const [supports, setSupports] = useState<string>('all')
  const [submittedBy, setSubmittedBy] = useState('')
  const [hypothesisFilter, setHypothesisFilter] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [searchHits, setSearchHits] = useState<SearchHit[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (evType !== 'all') p.set('type', evType)
    if (supports === 'true') p.set('supports_hypothesis', 'true')
    if (supports === 'false') p.set('supports_hypothesis', 'false')
    if (submittedBy.trim()) p.set('submitted_by', submittedBy.trim())
    if (hypothesisFilter.trim()) p.set('hypothesis_id', hypothesisFilter.trim())
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [evType, supports, submittedBy, hypothesisFilter])

  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    setError(null)
    try {
      const data = (await apiFetch(`/api/v1/evidence/hub${qs}`)) as HubRow[]
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load evidence hub')
      setRows([])
    }
  }, [qs])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount / filter fetch
    void load()
  }, [load])

  const runSearch = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const q = searchQ.trim()
      if (!q || !getWorkspaceId()) {
        setSearchHits([])
        return
      }
      setSearchLoading(true)
      setError(null)
      try {
        const data = (await apiFetch(
          `/api/v1/search?q=${encodeURIComponent(q)}&types=evidence&size=50`,
        )) as SearchHit[]
        setSearchHits(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setSearchHits([])
      } finally {
        setSearchLoading(false)
      }
    },
    [searchQ],
  )

  const hitIds = useMemo(() => new Set(searchHits.map((h) => h.id)), [searchHits])
  const displayRows =
    searchHits.length > 0 ? rows.filter((r) => hitIds.has(r.id)) : rows

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
      <PageHeader
        title="Evidence"
        subtitle="Workspace-wide evidence with filters and optional OpenSearch queries."
      />

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <Card className="mb-6">
        <CardContent className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={evType} onValueChange={setEvType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {EVID_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Supports hypothesis</Label>
            <Select value={supports} onValueChange={setSupports}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="true">Supports</SelectItem>
                <SelectItem value="false">Refutes / neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="hub-submitter">Submitter user id</Label>
            <Input
              id="hub-submitter"
              placeholder="UUID"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hub-hyp">Hypothesis id</Label>
            <Input
              id="hub-hyp"
              placeholder="UUID filter"
              value={hypothesisFilter}
              onChange={(e) => setHypothesisFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <form onSubmit={runSearch} className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="hub-search">Search evidence (OpenSearch)</Label>
          <Input
            id="hub-search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="e.g. IP, filename, SIEM vendor…"
          />
        </div>
        <Button type="submit" disabled={searchLoading}>
          {searchLoading ? 'Searching…' : 'Search'}
        </Button>
        {searchHits.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchHits([])
              setSearchQ('')
            }}
          >
            Clear search
          </Button>
        ) : null}
      </form>

      <ul className="space-y-3 text-left">
        {displayRows.map((r) => (
          <li key={r.id}>
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span className="font-mono uppercase">{r.type}</span>
                      <span>· v{r.version}</span>
                      <SupportBadge supports={r.supports_hypothesis} />
                      <span>· {new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Hypothesis:{' '}
                      <Link to={`/hypotheses/${r.hypothesis_id}`} className="text-primary hover:underline">
                        {r.hypothesis_title}
                      </Link>
                    </p>
                    {r.content ? (
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                        {r.content}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link
                      to={`/hypotheses/${r.hypothesis_id}#evidence`}
                      className="text-sm text-primary underline-offset-2 hover:underline"
                    >
                      Open hypothesis
                    </Link>
                    {r.storage_key ? (
                      <button
                        type="button"
                        className="text-left text-sm text-primary underline-offset-2 hover:underline"
                        onClick={() => {
                          const safe = (r.title || 'evidence').replace(/[^\w.-]+/g, '_')
                          void downloadEvidenceFile(r.id, safe)
                        }}
                      >
                        Download file
                      </button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {displayRows.length === 0 && !error ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {searchHits.length > 0 ? 'No hub rows match those search hits (try widening filters).' : 'No evidence.'}
        </p>
      ) : null}
    </AppShell>
  )
}
