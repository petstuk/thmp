const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

export function getAccessToken(): string | null {
  return localStorage.getItem('thmp_access_token')
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('thmp_access_token', access)
  localStorage.setItem('thmp_refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('thmp_access_token')
  localStorage.removeItem('thmp_refresh_token')
  localStorage.removeItem('thmp_workspace_id')
}

export function getWorkspaceId(): string | null {
  return localStorage.getItem('thmp_workspace_id')
}

export function setWorkspaceId(id: string) {
  localStorage.setItem('thmp_workspace_id', id)
}

type FetchOpts = RequestInit & { skipWorkspace?: boolean; skipAuth?: boolean }

export async function apiFetch(path: string, opts: FetchOpts = {}) {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(opts.headers as HeadersInit | undefined)
  if (!opts.skipAuth) {
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const ws = getWorkspaceId()
  if (ws && !opts.skipWorkspace) headers.set('X-Workspace-Id', ws)
  if (!headers.has('Content-Type') && opts.body && !(opts.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(url, { ...opts, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function downloadNavigatorLayerJson() {
  const data = await apiFetch('/api/v1/attack/navigator-layer')
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'thmp-navigator-layer.json'
  a.click()
  URL.revokeObjectURL(url)
}
