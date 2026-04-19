import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, getWorkspaceId, setWorkspaceId } from '../api'
import { useAuth } from '../auth/AuthContext'

type Hypothesis = {
  id: string
  title: string
  status: string
  severity: string
  workspace_id: string
}

export function HypothesesPage() {
  const { user, logout } = useAuth()
  const [items, setItems] = useState<Hypothesis[]>([])
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
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
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await apiFetch('/api/v1/hypotheses', {
        method: 'POST',
        body: JSON.stringify({ title, description: '' }),
      })
      setTitle('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hypotheses</h1>
          <p className="text-sm text-thmp-muted">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-thmp-muted">
            Workspace{' '}
            <select
              className="ml-1 rounded border border-thmp-border bg-thmp-bg px-2 py-1 text-thmp-fg"
              value={getWorkspaceId() || ''}
              onChange={(e) => {
                setWorkspaceId(e.target.value)
                void load()
              }}
            >
              {user.workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.role})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border border-thmp-border px-3 py-1 text-sm hover:bg-thmp-border/30"
          >
            Log out
          </button>
        </div>
      </header>

      <form onSubmit={onCreate} className="mb-8 flex flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-md border border-thmp-border bg-thmp-bg px-3 py-2"
          placeholder="New hypothesis title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <button
          type="submit"
          className="rounded-md bg-thmp-accent px-4 py-2 font-medium text-white hover:bg-thmp-accent-hover"
        >
          Add
        </button>
      </form>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      <ul className="space-y-3 text-left">
        {items.map((h) => (
          <li key={h.id} className="rounded-lg border border-thmp-border px-4 py-3">
            <Link to={`/hypotheses/${h.id}`} className="font-medium text-thmp-fg hover:text-thmp-accent">
              {h.title}
            </Link>
            <div className="text-xs text-thmp-muted">
              {h.status} · {h.severity}
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-thmp-muted">No hypotheses yet.</p>
      ) : null}
    </div>
  )
}
