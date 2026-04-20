import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { AttackCatalogBanner } from '@/components/AttackCatalogBanner'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { downloadNavigatorLayerJson, getWorkspaceId, setWorkspaceId } from '@/api'
import { cn } from '@/lib/utils'
import { useMemo, useState } from 'react'

const INTEGRATIONS_ROLES = new Set(['admin', 'manager'])

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

type Props = {
  children: React.ReactNode
  workspaceRole: string | null
  onWorkspaceChange?: () => void
}

export function AppShell({ children, workspaceRole, onWorkspaceChange }: Props) {
  const { user, logout } = useAuth()
  const [navError, setNavError] = useState<string | null>(null)

  if (!user) {
    return children
  }

  const workspaceId = getWorkspaceId() || ''
  const showIntegrations = useMemo(() => {
    const role = user.workspaces.find((w) => w.id === workspaceId)?.role
    return role != null && INTEGRATIONS_ROLES.has(role)
  }, [user.workspaces, workspaceId])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AttackCatalogBanner workspaceRole={workspaceRole} />

      <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <Link to="/" className="shrink-0 text-lg font-semibold tracking-tight text-foreground">
            THMP
          </Link>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
            <NavLink to="/" className={navLinkClass} end>
              Overview
            </NavLink>
            <NavLink to="/hypotheses" className={navLinkClass}>
              Hypotheses
            </NavLink>
            <NavLink to="/ingestion" className={navLinkClass}>
              Ingestion
            </NavLink>
            {showIntegrations ? (
              <NavLink to="/integrations" className={navLinkClass}>
                Integrations
              </NavLink>
            ) : null}
            <NavLink to="/hunts" className={navLinkClass}>
              Hunts
            </NavLink>
            <NavLink to="/evidence" className={navLinkClass}>
              Evidence
            </NavLink>
            <NavLink to="/findings" className={navLinkClass}>
              Findings
            </NavLink>
            <NavLink to="/reporting" className={navLinkClass}>
              Reporting
            </NavLink>
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="app-shell-workspace" className="sr-only">
              Workspace
            </Label>
            <Select
              value={workspaceId}
              onValueChange={(v) => {
                setWorkspaceId(v)
                onWorkspaceChange?.()
              }}
            >
              <SelectTrigger id="app-shell-workspace" size="sm" className="w-[min(100%,14rem)]">
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                {user.workspaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNavError(null)
              void downloadNavigatorLayerJson().catch((err) =>
                setNavError(err instanceof Error ? err.message : 'Navigator export failed'),
              )
            }}
          >
            Navigator layer
          </Button>
          <ThemeToggle />
          <Button type="button" variant="outline" size="sm" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </header>

      {navError ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {navError}
        </p>
      ) : null}

      {children}
    </div>
  )
}
