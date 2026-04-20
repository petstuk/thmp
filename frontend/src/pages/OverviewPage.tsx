import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type HypothesisRow = {
  id: string
  title: string
  status: string
  severity: string
  workspace_id: string
}

type HuntRow = {
  id: string
  name: string
  status: string
}

type FindingRow = {
  id: string
  title: string
  outcome: string
  hunt_id: string
}

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

export function OverviewPage() {
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null

  const [hypotheses, setHypotheses] = useState<HypothesisRow[] | null>(null)
  const [hunts, setHunts] = useState<HuntRow[] | null>(null)
  const [findings, setFindings] = useState<FindingRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    setLoadError(null)
    try {
      const h = (await apiFetch('/api/v1/hypotheses')) as HypothesisRow[]
      setHypotheses(Array.isArray(h) ? h : [])
    } catch (e) {
      setHypotheses(null)
      setLoadError(e instanceof Error ? e.message : 'Failed to load hypotheses')
    }
    try {
      const u = (await apiFetch('/api/v1/hunts')) as HuntRow[]
      setHunts(Array.isArray(u) ? u : [])
    } catch {
      setHunts(null)
    }
    try {
      const f = (await apiFetch('/api/v1/hunts/findings')) as FindingRow[]
      setFindings(Array.isArray(f) ? f : [])
    } catch {
      setFindings(null)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  const statusCounts = useMemo(() => {
    if (!hypotheses) return null
    const m: Record<string, number> = {}
    for (const x of hypotheses) {
      m[x.status] = (m[x.status] ?? 0) + 1
    }
    return m
  }, [hypotheses])

  const recentHypotheses = useMemo(() => {
    if (!hypotheses?.length) return []
    return hypotheses.slice(0, 5)
  }, [hypotheses])

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
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        {loadError ? (
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl tabular-nums">
                {hypotheses === null ? '—' : hypotheses.length}
              </CardTitle>
              <CardDescription>Hypotheses in workspace</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl tabular-nums">{hunts === null ? '—' : hunts.length}</CardTitle>
              <CardDescription>Hunts</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl tabular-nums">
                {findings === null ? '—' : findings.length}
              </CardTitle>
              <CardDescription>Findings</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium leading-snug">Evidence</CardTitle>
              <CardDescription>
                Stored per hypothesis — open Hypotheses or Evidence hub to review.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {statusCounts && Object.keys(statusCounts).length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hypotheses by status</CardTitle>
              <CardDescription>From the current workspace list payload.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-3 text-sm">
                {Object.entries(statusCounts)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, v]) => (
                    <li key={k} className="rounded-md bg-muted px-3 py-1">
                      <span className="font-medium text-foreground">{k}</span>{' '}
                      <span className="text-muted-foreground">({v})</span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/hypotheses">Manage hypotheses</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/hunts">View hunts</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/findings">View findings</Link>
          </Button>
        </div>

        {recentHypotheses.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent hypotheses</CardTitle>
              <CardDescription>First entries from the workspace list (API order).</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-left">
                {recentHypotheses.map((h) => (
                  <li key={h.id}>
                    <Link
                      to={`/hypotheses/${h.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {h.title}
                    </Link>
                    <span className="text-xs text-muted-foreground"> · {h.status}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  )
}
