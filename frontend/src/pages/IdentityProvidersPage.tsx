import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch, getWorkspaceId } from '@/api'
import { useAuth } from '@/auth/AuthContext'

type IdpRow = {
  id: string
  slug: string
  display_name: string
  issuer_url: string
  client_id: string
  default_role: string
  is_enabled: boolean
}

const ADMIN_ROLES = new Set(['admin'])

export function IdentityProvidersPage() {
  const { user } = useAuth()
  const workspaceId = getWorkspaceId() || ''
  const workspaceRole = user?.workspaces.find((w) => w.id === workspaceId)?.role ?? null
  const canManage = workspaceRole != null && ADMIN_ROLES.has(workspaceRole)

  const [providers, setProviders] = useState<IdpRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [issuerUrl, setIssuerUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [defaultRole, setDefaultRole] = useState('analyst')

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = (await apiFetch('/api/v1/auth/oidc/providers')) as IdpRow[]
      setProviders(Array.isArray(data) ? data : [])
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
      await apiFetch('/api/v1/auth/oidc/providers', {
        method: 'POST',
        body: JSON.stringify({
          slug: slug.trim(),
          display_name: displayName.trim(),
          issuer_url: issuerUrl.trim(),
          client_id: clientId.trim(),
          client_secret: clientSecret,
          default_role: defaultRole,
          workspace_id: workspaceId,
        }),
      })
      setSlug('')
      setDisplayName('')
      setIssuerUrl('')
      setClientId('')
      setClientSecret('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    }
  }

  if (!user) {
    return (
      <div className="px-4 py-16 text-center">
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">Sign in</Link>
      </div>
    )
  }

  return (
    <AppShell workspaceRole={workspaceRole} onWorkspaceChange={() => void load()}>
      <PageHeader
        title="Identity Providers"
        subtitle="Configure OIDC/OAuth2 identity providers for single sign-on."
      />

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {!canManage ? (
        <p className="text-sm text-muted-foreground">Workspace admin role required.</p>
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">Add identity provider</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onCreate} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="idp-slug">Slug (URL-safe)</Label>
                    <Input id="idp-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="okta" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idp-name">Display name</Label>
                    <Input id="idp-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Okta SSO" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idp-issuer">Issuer URL</Label>
                  <Input id="idp-issuer" value={issuerUrl} onChange={(e) => setIssuerUrl(e.target.value)} placeholder="https://accounts.google.com" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="idp-client-id">Client ID</Label>
                    <Input id="idp-client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idp-client-secret">Client secret</Label>
                    <Input id="idp-client-secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idp-role">Default role for new users</Label>
                  <Input id="idp-role" value={defaultRole} onChange={(e) => setDefaultRole(e.target.value)} placeholder="analyst" />
                </div>
                <Button type="submit">Add provider</Button>
              </form>
            </CardContent>
          </Card>

          <ul className="space-y-4">
            {providers.map((p) => (
              <li key={p.id}>
                <Card>
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground">{p.issuer_url} · slug: <code>{p.slug}</code> · default role: {p.default_role}</p>
                    </div>
                    <Badge variant={p.is_enabled ? 'default' : 'outline'}>
                      {p.is_enabled ? 'enabled' : 'disabled'}
                    </Badge>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {providers.length === 0 ? <p className="mt-4 text-center text-sm text-muted-foreground">No providers configured.</p> : null}
        </>
      )}
    </AppShell>
  )
}
