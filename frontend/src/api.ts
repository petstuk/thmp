const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

/** Thrown for non-OK responses; includes HTTP status for UI hints. */
export class ApiError extends Error {
  readonly status: number
  readonly rawBody: string

  constructor(message: string, status: number, rawBody: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.rawBody = rawBody
  }
}

function formatApiErrorMessage(text: string, fallback: string): string {
  const trimmed = text.trim()
  if (!trimmed) return fallback
  try {
    const j = JSON.parse(trimmed) as { detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
    if (Array.isArray(j.detail)) {
      return j.detail
        .map((x: { msg?: string; loc?: unknown }) => (typeof x === 'object' && x && 'msg' in x ? String(x.msg) : JSON.stringify(x)))
        .join('; ')
    }
    if (typeof j.detail === 'object' && j.detail !== null && 'message' in j.detail) {
      return String((j.detail as { message: string }).message)
    }
  } catch {
    /* plain text (e.g. Traefik 404 body) */
  }
  return trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed
}

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

type FetchOpts = RequestInit & { skipWorkspace?: boolean; skipAuth?: boolean; ifMatch?: string | null }

export function parseConflictCurrent(rawBody: string): Record<string, unknown> | null {
  try {
    const j = JSON.parse(rawBody) as { detail?: { current?: Record<string, unknown>; error?: string } }
    if (j.detail && typeof j.detail === 'object' && j.detail.current) {
      return j.detail.current
    }
  } catch {
    /* not JSON */
  }
  return null
}

export async function apiFetch(path: string, opts: FetchOpts = {}) {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const { ifMatch, ...rest } = opts
  const headers = new Headers(rest.headers as HeadersInit | undefined)
  if (ifMatch) {
    headers.set('If-Match', ifMatch)
  }
  if (!rest.skipAuth) {
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const ws = getWorkspaceId()
  if (ws && !rest.skipWorkspace) headers.set('X-Workspace-Id', ws)
  if (!headers.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(url, { ...rest, headers })
  if (!res.ok) {
    const text = await res.text()
    const msg = formatApiErrorMessage(text, res.statusText)
    throw new ApiError(msg, res.status, text)
  }
  if (res.status === 204) return null
  return res.json()
}

/** Download evidence file (Bearer + workspace). Triggers a browser download. */
export async function downloadEvidenceFile(evidenceId: string, downloadName: string) {
  const url = `${base}/api/v1/evidence/${evidenceId}/file`
  const headers = new Headers()
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const ws = getWorkspaceId()
  if (ws) headers.set('X-Workspace-Id', ws)
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text()
    const msg = formatApiErrorMessage(text, res.statusText)
    throw new ApiError(msg, res.status, text)
  }
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = downloadName
  a.click()
  URL.revokeObjectURL(href)
}

export async function uploadEvidenceFile(
  hypothesisId: string,
  title: string,
  file: File,
  opts?: { metadata?: Record<string, unknown> },
) {
  const url = `${base}/api/v1/evidence/upload`
  const headers = new Headers()
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const ws = getWorkspaceId()
  if (ws) headers.set('X-Workspace-Id', ws)
  const fd = new FormData()
  fd.append('hypothesis_id', hypothesisId)
  fd.append('title', title)
  if (opts?.metadata) {
    fd.append('metadata_json', JSON.stringify(opts.metadata))
  }
  fd.append('file', file)
  const res = await fetch(url, { method: 'POST', headers, body: fd })
  const text = await res.text()
  if (!res.ok) {
    const msg = formatApiErrorMessage(text, res.statusText)
    throw new ApiError(msg, res.status, text)
  }
  return JSON.parse(text) as Record<string, unknown>
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

export type ReportType = 'hypothesis' | 'hunt' | 'coverage' | 'summary'
export type ReportJobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export type ReportTemplate = {
  id: string
  workspace_id: string
  name: string
  template_body: string
  branding: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ReportJob = {
  id: string
  workspace_id: string
  report_type: ReportType
  template_id: string | null
  status: ReportJobStatus
  params: Record<string, unknown>
  error: string | null
  pdf_key: string | null
  stix_key: string | null
  created_by: string
  created_by_email: string
  created_by_role: string
  created_at: string
  updated_at: string
}

export type ReportSchedule = {
  id: string
  workspace_id: string
  name: string
  report_type: ReportType
  template_id: string | null
  params: Record<string, unknown>
  recipients: Record<string, unknown>
  cron: string | null
  interval_minutes: number
  enabled: boolean
  created_by: string
  created_by_email: string
  created_by_role: string
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
  updated_at: string
}

export async function listReportTemplates() {
  return (await apiFetch('/api/v1/reports/templates')) as ReportTemplate[]
}

export async function createReportTemplate(body: {
  name: string
  template_body: string
  branding?: Record<string, unknown>
}) {
  return (await apiFetch('/api/v1/reports/templates', {
    method: 'POST',
    body: JSON.stringify(body),
  })) as ReportTemplate
}

export async function listReportJobs(limit = 20) {
  return (await apiFetch(`/api/v1/reports/jobs?limit=${limit}`)) as ReportJob[]
}

export async function createReportJob(body: {
  report_type: ReportType
  template_id?: string | null
  params?: Record<string, unknown>
}) {
  return (await apiFetch('/api/v1/reports/jobs', {
    method: 'POST',
    body: JSON.stringify(body),
  })) as ReportJob
}

export async function listReportSchedules() {
  return (await apiFetch('/api/v1/reports/schedules')) as ReportSchedule[]
}

export async function createReportSchedule(body: {
  name: string
  report_type: ReportType
  template_id?: string | null
  params?: Record<string, unknown>
  recipients?: Record<string, unknown>
  cron?: string | null
  interval_minutes?: number
  enabled?: boolean
}) {
  return (await apiFetch('/api/v1/reports/schedules', {
    method: 'POST',
    body: JSON.stringify(body),
  })) as ReportSchedule
}

export async function runReportScheduleNow(scheduleId: string) {
  return (await apiFetch(`/api/v1/reports/schedules/${scheduleId}/run`, {
    method: 'POST',
  })) as ReportJob
}

export async function downloadReportArtifact(jobId: string, format: 'pdf' | 'stix') {
  const url = `${base}/api/v1/reports/jobs/${jobId}/download?format=${format}`
  const headers = new Headers()
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const ws = getWorkspaceId()
  if (ws) headers.set('X-Workspace-Id', ws)
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text()
    const msg = formatApiErrorMessage(text, res.statusText)
    throw new ApiError(msg, res.status, text)
  }
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = `thmp-report-${jobId}.${format === 'pdf' ? 'pdf' : 'stix.json'}`
  a.click()
  URL.revokeObjectURL(href)
}
