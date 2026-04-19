import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await register(email, password, displayName)
      nav('/hypotheses')
    } catch (err) {
      if (err instanceof TypeError && String(err.message).includes('fetch')) {
        setError(
          'Cannot reach the API. Run `docker compose up`, open http://localhost:5173 (not a raw IP unless CORS allows it), and keep VITE_API_BASE_URL empty so /api is proxied by Vite.',
        )
        return
      }
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold text-thmp-fg">Create account</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 text-left">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-thmp-muted">Display name</span>
          <input
            className="rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-thmp-muted">Email</span>
          <input
            className="rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-thmp-muted">Password (min 8)</span>
          <input
            className="rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          className="rounded-md bg-thmp-accent px-4 py-2 font-medium text-white hover:bg-thmp-accent-hover"
        >
          Register
        </button>
      </form>
      <p className="text-sm text-thmp-muted">
        Already have an account? <Link to="/login" className="text-thmp-accent hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
