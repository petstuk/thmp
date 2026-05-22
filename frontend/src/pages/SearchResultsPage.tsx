import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { ThmpCard } from '@/components/thmp/ThmpCard'
import { Badge } from '@/components/ui/badge'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type SearchHit = {
  id: string
  type: string
  title: string
  snippet: string
  workspace_id: string
  score: number
}

function hitPath(hit: SearchHit): string {
  switch (hit.type) {
    case 'hypothesis':
      return `/hypotheses/${hit.id}`
    case 'evidence':
      return `/evidence#${hit.id}`
    case 'finding':
      return `/findings#${hit.id}`
    default:
      return '#'
  }
}

export function SearchResultsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workspaceId = getWorkspaceId() || ''
  const workspaceRole = user?.workspaces.find((w) => w.id === workspaceId)?.role ?? null

  const doSearch = useCallback(async () => {
    if (!q || !getWorkspaceId()) return
    setLoading(true)
    setError(null)
    try {
      const data = (await apiFetch(`/api/v1/search?q=${encodeURIComponent(q)}`)) as SearchHit[]
      setHits(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- query-driven fetch
    void doSearch()
  }, [doSearch])

  return (
    <AppShell workspaceRole={workspaceRole} onWorkspaceChange={() => void doSearch()}>
      <PageHeader
        title="Search Results"
        subtitle={q ? `Results for "${q}"` : 'Search hypotheses, evidence, and findings.'}
      />

      {loading ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error && hits.length === 0 && q ? (
        <p className="text-sm text-muted-foreground">No results found.</p>
      ) : null}

      <ul className="space-y-3">
        {hits.map((hit) => (
          <li key={hit.id}>
            <ThmpCard>
              <div>
                <div className="flex items-start justify-between gap-3">
                  <Link to={hitPath(hit)} className="font-medium hover:text-primary">
                    {hit.title || '(untitled)'}
                  </Link>
                  <Badge variant="outline" className="capitalize shrink-0">
                    {hit.type}
                  </Badge>
                </div>
                {hit.snippet ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{hit.snippet}</p>
                ) : null}
              </div>
            </ThmpCard>
          </li>
        ))}
      </ul>
    </AppShell>
  )
}
