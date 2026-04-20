import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { apiFetch, getWorkspaceId } from '../api'

export type AttackCatalogStatus = {
  last_sync_at: string | null
  source_url_display: string | null
  bundle_attack_version: string | null
  tactic_count: number
  technique_count: number
  catalog_ready: boolean
}

type Props = {
  workspaceRole: string | null
}

export function AttackCatalogBanner({ workspaceRole }: Props) {
  const [status, setStatus] = useState<AttackCatalogStatus | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const ws = getWorkspaceId()

  const load = useCallback(async () => {
    if (!ws) return
    setLoadError(null)
    try {
      const s = (await apiFetch('/api/v1/attack/status')) as AttackCatalogStatus
      setStatus(s)
    } catch (e) {
      setStatus(null)
      setLoadError(e instanceof Error ? e.message : 'Failed to load ATT&CK status')
    }
  }, [ws])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  async function onSync() {
    if (
      !confirm(
        'Download and import the MITRE ATT&CK Enterprise bundle from the configured URL? This may take 1–3 minutes.',
      )
    ) {
      return
    }
    setSyncing(true)
    setSyncError(null)
    try {
      await apiFetch('/api/v1/attack/sync', { method: 'POST' })
      await load()
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (!ws) return null
  if (loadError && !status) {
    return (
      <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        ATT&CK catalogue status unavailable: {loadError}
      </div>
    )
  }
  if (!status) return null
  if (status.catalog_ready) return null

  const isAdmin = workspaceRole === 'admin'
  return (
    <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">ATT&CK catalogue not loaded</p>
      <p className="mt-1 text-muted-foreground">
        Technique search and validation require a sync from MITRE (workspace admin). See{' '}
        <code className="rounded bg-muted px-1 text-xs">docs/development.md</code> for manual{' '}
        <code className="rounded bg-muted px-1 text-xs">curl</code> steps if the button fails.
      </p>
      {isAdmin ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={syncing} onClick={() => void onSync()}>
            {syncing ? 'Syncing…' : 'Sync ATT&CK now'}
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-muted-foreground">Ask a workspace admin to run a sync.</p>
      )}
      {syncError ? <p className="mt-2 text-xs text-destructive">{syncError}</p> : null}
    </div>
  )
}
