import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Bell, Menu, Search } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { AttackCatalogBanner } from '@/components/AttackCatalogBanner'
import { ThmpLogo } from '@/components/thmp/ThmpLogo'
import { UserAvatar } from '@/components/thmp/UserAvatar'
import { BoardIcon, DashboardIcon, ReportIcon } from '@/components/thmp/nav-icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { downloadNavigatorLayerJson, getWorkspaceId, setWorkspaceId } from '@/api'
import { appDisplayName } from '@/lib/branding'
import { navVisibility } from '@/lib/nav-matrix'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex w-full items-center rounded-md px-3 py-2 text-[12.5px] transition-colors',
    isActive
      ? 'bg-sidebar-accent font-medium text-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

const groupClass = 'mb-1 mt-4 px-3 text-xs font-semibold tracking-wide text-muted-foreground first:mt-0'

type ShellNavProps = {
  role: string | null
}

function ShellNav({ role }: ShellNavProps) {
  const showIntegrations = navVisibility('Integrations', role) !== false
  const showAudit = navVisibility('AuditLog', role) !== false
  const showAdmin = navVisibility('Admin', role) !== false
  const nestedClass = ({ isActive }: { isActive: boolean }) =>
    cn(navLinkClass({ isActive }), 'ml-4 text-[11.5px]')

  return (
    <div className="flex flex-col gap-0.5" aria-label="Main">
      <p className={groupClass}>Work</p>
      <NavLink to="/" className={navLinkClass} end>
        <DashboardIcon className="mr-2 size-3.5" />
        Dashboard
      </NavLink>
      <NavLink to="/hypotheses" className={navLinkClass}>
        Hypotheses
      </NavLink>
      <NavLink to="/board" className={navLinkClass}>
        <BoardIcon className="mr-2 size-3.5" />
        Hunt Board
      </NavLink>
      <NavLink to="/evidence" className={navLinkClass}>
        Evidence
      </NavLink>
      <NavLink to="/navigator" className={navLinkClass}>
        ATT&CK
      </NavLink>
      <p className={groupClass}>Platform</p>
      {showIntegrations ? (
        <>
          <NavLink to="/integrations" className={navLinkClass}>
            Integrations
          </NavLink>
          <NavLink to="/ingestion" className={nestedClass}>
            Ingestion Queue
          </NavLink>
        </>
      ) : null}
      <NavLink to="/reporting" className={navLinkClass}>
        <ReportIcon className="mr-2 size-3.5" />
        Reports
      </NavLink>
      {showAudit ? <NavLink to="/audit" className={navLinkClass}>Audit Log</NavLink> : null}
      {showAdmin ? (
        <>
          <p className={groupClass}>Admin</p>
          <NavLink to="/admin/identity-providers" className={navLinkClass}>
            Identity Providers
          </NavLink>
        </>
      ) : null}
    </div>
  )
}

type Props = {
  children: React.ReactNode
  workspaceRole: string | null
  onWorkspaceChange?: () => void
  layout?: 'default' | 'wide' | 'full'
}

function SearchBar({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    if (!trimmed) return
    void navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    setQ('')
  }

  return (
    <form onSubmit={onSubmit} className={cn('relative flex items-center', className)}>
      <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        className="h-8 pl-8 text-sm w-52 font-[13px] focus:w-72 transition-all"
        aria-label="Search hypotheses, evidence, findings"
      />
    </form>
  )
}

export function AppShell({ children, workspaceRole, onWorkspaceChange, layout = 'default' }: Props) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navError, setNavError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer on navigation
    setMobileOpen(false)
  }, [location.pathname])

  const workspaceId = getWorkspaceId() || ''
  const activeRole = useMemo(
    () => user?.workspaces.find((w) => w.id === workspaceId)?.role ?? workspaceRole ?? null,
    [user?.workspaces, workspaceId, workspaceRole],
  )

  function onNavigatorExport() {
    setNavError(null)
    void downloadNavigatorLayerJson().catch((err) =>
      setNavError(err instanceof Error ? err.message : 'Navigator export failed'),
    )
  }

  if (!user) {
    return children
  }

  const session = user

  function workspaceSelectField(triggerId: string) {
    return (
      <>
        <Label htmlFor={triggerId} className="sr-only">
          Workspace
        </Label>
        <Select
          value={workspaceId}
          onValueChange={(v) => {
            setWorkspaceId(v)
            onWorkspaceChange?.()
          }}
        >
          <SelectTrigger id={triggerId} size="sm" className="w-[min(100%,14rem)]">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            {session.workspaces.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name} ({w.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    )
  }

  const navigatorButton = (
    <Button type="button" variant="outline" size="sm" onClick={onNavigatorExport}>
      Navigator layer
    </Button>
  )

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background lg:hidden">
        <div className="flex h-11 items-center gap-2 px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100%,20rem)] gap-0 p-0" showCloseButton>
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Main menu and workspace links</SheetDescription>
              </SheetHeader>
              <div className="border-b px-4 py-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  <ThmpLogo />
                  {appDisplayName}
                </Link>
              </div>
              <div className="overflow-y-auto px-2 py-3">
                <ShellNav role={activeRole} />
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <ThmpLogo />
            {appDisplayName}
          </Link>
          <span className="min-w-0 flex-1" />
          <Button type="button" variant="outline" size="icon-sm" asChild aria-label="Notifications">
            <Link to="/notifications">
              <Bell className="size-4" />
            </Link>
          </Button>
          <ThemeToggle />
          <Button type="button" variant="outline" size="sm" onClick={() => logout()}>
            Log out
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2">
          {workspaceSelectField('app-shell-workspace-mobile')}
          {navigatorButton}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[200px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <div className="border-b px-4 py-3">
            <Link to="/" className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
              <ThmpLogo />
              {appDisplayName}
            </Link>
            <p className="mt-2 inline-flex rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              v2.4
            </p>
          </div>
          <div className="border-b px-3 py-3">{workspaceSelectField('app-shell-workspace-sidebar')}</div>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            <ShellNav role={activeRole} />
          </nav>
          {user ? (
            <div className="border-t px-3 py-3">
              <div className="flex items-center gap-2">
                <UserAvatar initials={user.email.slice(0, 2)} />
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground">{user.email}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{activeRole ?? 'readonly'}</p>
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="hidden h-11 items-center justify-end gap-2 border-b bg-background px-6 lg:flex">
            <SearchBar />
            {navigatorButton}
            <Button type="button" variant="outline" size="icon-sm" asChild aria-label="Notifications">
              <Link to="/notifications">
                <Bell className="size-4" />
              </Link>
            </Button>
            <ThemeToggle />
            <Button type="button" variant="outline" size="sm" onClick={() => logout()}>
              Log out
            </Button>
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div
              className={cn(
                'px-4 py-8',
                layout === 'default' && 'mx-auto max-w-5xl',
                layout === 'wide' && 'mx-auto max-w-[94rem]',
                layout === 'full' && 'mx-0 w-full',
              )}
            >
              <AttackCatalogBanner workspaceRole={workspaceRole} />

              {navError ? (
                <p className="mb-4 text-sm text-destructive" role="alert">
                  {navError}
                </p>
              ) : null}

              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
