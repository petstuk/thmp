import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

function workspaceRole(
  user: { workspaces: { id: string; role: string }[] },
  workspaceId: string | null,
): string | null {
  if (!workspaceId) return null
  const w = user.workspaces.find((x) => x.id === workspaceId)
  return w?.role ?? null
}

export function ReportingPage() {
  const { user } = useAuth()
  const ws = getWorkspaceId()
  const role = user ? workspaceRole(user, ws) : null

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
    <AppShell workspaceRole={role}>
      <h1 className="mb-4 text-2xl font-semibold">Reporting</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        Reporting and exports beyond ATT&CK Navigator layers will live here when the Reporting service
        and APIs are wired. Use <strong className="text-foreground">Navigator layer</strong> in the
        header for the current workspace export.
      </p>
    </AppShell>
  )
}
