import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      nav('/hypotheses')
    } catch (err) {
      if (err instanceof TypeError && String(err.message).includes('fetch')) {
        setError(
          'Cannot reach the API. Run `docker compose up` and use http://localhost:5173 with an empty VITE_API_BASE_URL (default) so requests go through the Vite /api proxy.',
        )
        return
      }
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold text-thmp-fg">Sign in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 text-left">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-thmp-muted">Email</span>
          <input
            className="rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="username"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-thmp-muted">Password</span>
          <input
            className="rounded-md border border-thmp-border bg-thmp-bg px-3 py-2 text-thmp-fg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          className="rounded-md bg-thmp-accent px-4 py-2 font-medium text-white hover:bg-thmp-accent-hover"
        >
          Continue
        </button>
      </form>
      <p className="text-sm text-thmp-muted">
        No account? <Link to="/register" className="text-thmp-accent hover:underline">Register</Link>
      </p>
    </div>
  )
}
