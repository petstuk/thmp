import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'
import { TechniqueTypeahead, type TechniqueEntry } from '@/components/TechniqueTypeahead'

type Hypothesis = {
  id: string
  title: string
  status: string
  severity: string
  workspace_id: string
}

export function HypothesesPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Hypothesis[]>([])
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [techniqueEntries, setTechniqueEntries] = useState<TechniqueEntry[]>([])
  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    setError(null)
    try {
      const data = (await apiFetch('/api/v1/hypotheses')) as Hypothesis[]
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await apiFetch('/api/v1/hypotheses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: '',
          attack_technique_ids: techniqueEntries.length ? techniqueEntries.map((e) => e.id) : undefined,
        }),
      })
      setTitle('')
      setTechniqueEntries([])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
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

  const workspaceId = getWorkspaceId() || ''
  const workspaceRole = user.workspaces.find((w) => w.id === workspaceId)?.role ?? null

  return (
    <AppShell workspaceRole={workspaceRole} onWorkspaceChange={() => void load()}>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Hypotheses</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <form onSubmit={onCreate} className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="flex-1"
            placeholder="New hypothesis title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Button type="submit">Add</Button>
        </div>
        <TechniqueTypeahead entries={techniqueEntries} onChange={setTechniqueEntries} />
      </form>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <ul className="space-y-3 text-left">
        {items.map((h) => (
          <li key={h.id}>
            <Card>
              <CardContent className="py-4">
                <Link
                  to={`/hypotheses/${h.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {h.title}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {h.status} · {h.severity}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No hypotheses yet.</p>
      ) : null}
    </AppShell>
  )
}
