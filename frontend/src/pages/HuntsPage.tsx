import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { ThmpCard } from '@/components/thmp/ThmpCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ThreatBadges'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type HuntRow = {
  id: string
  name: string
  status: string
  start_date: string
  end_date: string | null
}

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

export function HuntsPage() {
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null
  const canWrite =
    role != null && ['analyst', 'hunt_lead', 'ti_analyst', 'manager', 'admin'].includes(role)
  const [items, setItems] = useState<HuntRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createStart, setCreateStart] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [createEnd, setCreateEnd] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    setError(null)
    try {
      const data = (await apiFetch('/api/v1/hunts')) as HuntRow[]
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hunts')
      setItems([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!user || !canWrite || !createName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const start = new Date(createStart)
      if (Number.isNaN(start.getTime())) {
        setError('Invalid start date')
        return
      }
      const endIso =
        createEnd.trim() ? new Date(createEnd) : null
      if (createEnd.trim() && endIso && Number.isNaN(endIso.getTime())) {
        setError('Invalid end date')
        return
      }
      await apiFetch('/api/v1/hunts', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc,
          lead_id: user.id,
          start_date: start.toISOString(),
          end_date: endIso && !Number.isNaN(endIso.getTime()) ? endIso.toISOString() : null,
        }),
      })
      setCreateName('')
      setCreateDesc('')
      setCreateEnd('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create hunt failed')
    } finally {
      setCreating(false)
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
    <AppShell workspaceRole={role} onWorkspaceChange={() => void load()}>
      <PageHeader title="Hunts" subtitle="Track campaigns and timelines." />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {canWrite ? (
        <ThmpCard className="mb-8">
          <form
          onSubmit={(ev) => void onCreate(ev)}
          className="space-y-3"
        >
          <h2 className="text-sm font-medium">Create hunt</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="hunt-name">Name</Label>
              <Input
                id="hunt-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                placeholder="Quarterly emulations"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="hunt-desc">Description (optional)</Label>
              <Textarea
                id="hunt-desc"
                className="min-h-20"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hunt-start">Start</Label>
              <Input
                id="hunt-start"
                type="datetime-local"
                value={createStart}
                onChange={(e) => setCreateStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hunt-end">End (optional)</Label>
              <Input
                id="hunt-end"
                type="datetime-local"
                value={createEnd}
                onChange={(e) => setCreateEnd(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={creating || !createName.trim()}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
          </form>
        </ThmpCard>
      ) : null}
      <ul className="space-y-3 text-left">
        {items.map((h) => (
          <li key={h.id}>
            <ThmpCard>
              <div>
                <Link to={`/hunts/${h.id}`} className="font-medium text-foreground hover:underline">
                  {h.name}
                </Link>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <StatusBadge value={h.status} />
                  <span>starts {new Date(h.start_date).toLocaleDateString()}</span>
                  {h.end_date ? ` · ends ${new Date(h.end_date).toLocaleDateString()}` : ''}
                </div>
              </div>
            </ThmpCard>
          </li>
        ))}
      </ul>
      {items.length === 0 && !error ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No hunts in this workspace yet.</p>
      ) : null}
    </AppShell>
  )
}
