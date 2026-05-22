import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/thmp/PageHeader'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createReportJob,
  createReportSchedule,
  createReportTemplate,
  downloadReportArtifact,
  getWorkspaceId,
  listReportJobs,
  listReportSchedules,
  listReportTemplates,
  runReportScheduleNow,
  type ReportJob,
  type ReportSchedule,
  type ReportTemplate,
  type ReportType,
} from '@/api'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  const [reportType, setReportType] = useState<ReportType>('coverage')
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [jobs, setJobs] = useState<ReportJob[]>([])
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [hypothesisId, setHypothesisId] = useState('')
  const [huntId, setHuntId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [scheduleName, setScheduleName] = useState('Daily reporting digest')
  const [scheduleInterval, setScheduleInterval] = useState('1440')
  const [newTemplateName, setNewTemplateName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!getWorkspaceId()) return
    try {
      const [tpls, j, s] = await Promise.all([
        listReportTemplates(),
        listReportJobs(50),
        listReportSchedules(),
      ])
      setTemplates(Array.isArray(tpls) ? tpls : [])
      setJobs(Array.isArray(j) ? j : [])
      setSchedules(Array.isArray(s) ? s : [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reporting data')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load()
  }, [load])

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  )

  async function onCreateTemplate() {
    const name = newTemplateName.trim()
    if (!name) return
    setBusy(true)
    try {
      await createReportTemplate({ name, template_body: '' })
      setNewTemplateName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create template')
    } finally {
      setBusy(false)
    }
  }

  async function onRunReport() {
    setBusy(true)
    setError(null)
    const params: Record<string, unknown> = {}
    if (reportType === 'hypothesis' && hypothesisId.trim()) params.hypothesis_id = hypothesisId.trim()
    if (reportType === 'hunt' && huntId.trim()) params.hunt_id = huntId.trim()
    if (periodStart.trim()) params.period_start = periodStart
    if (periodEnd.trim()) params.period_end = periodEnd
    try {
      await createReportJob({
        report_type: reportType,
        template_id: selectedTemplateId || undefined,
        params,
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to queue report')
    } finally {
      setBusy(false)
    }
  }

  async function onCreateSchedule() {
    setBusy(true)
    setError(null)
    const interval = Number.parseInt(scheduleInterval, 10)
    const params: Record<string, unknown> = {}
    if (reportType === 'hypothesis' && hypothesisId.trim()) params.hypothesis_id = hypothesisId.trim()
    if (reportType === 'hunt' && huntId.trim()) params.hunt_id = huntId.trim()
    if (periodStart.trim()) params.period_start = periodStart
    if (periodEnd.trim()) params.period_end = periodEnd
    try {
      await createReportSchedule({
        name: scheduleName.trim() || 'Scheduled report',
        report_type: reportType,
        template_id: selectedTemplateId || undefined,
        params,
        interval_minutes: Number.isFinite(interval) && interval > 0 ? interval : 1440,
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create schedule')
    } finally {
      setBusy(false)
    }
  }

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
    <AppShell workspaceRole={role} onWorkspaceChange={() => void load()}>
      <PageHeader
        title="Reports"
        subtitle="Generate exports, inspect job history, and run scheduled report digests."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Generate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Report type</Label>
              <select
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                <option value="coverage">Coverage</option>
                <option value="summary">Summary</option>
                <option value="hypothesis">Hypothesis</option>
                <option value="hunt">Hunt</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Template</Label>
              <select
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">Default template</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
              {selectedTemplate ? (
                <p className="text-xs text-muted-foreground">{selectedTemplate.name}</p>
              ) : null}
            </div>
            {reportType === 'hypothesis' ? (
              <div className="space-y-1">
                <Label htmlFor="report-hypothesis-id">Hypothesis ID</Label>
                <Input
                  id="report-hypothesis-id"
                  value={hypothesisId}
                  onChange={(e) => setHypothesisId(e.target.value)}
                  placeholder="UUID"
                />
              </div>
            ) : null}
            {reportType === 'hunt' ? (
              <div className="space-y-1">
                <Label htmlFor="report-hunt-id">Hunt ID</Label>
                <Input
                  id="report-hunt-id"
                  value={huntId}
                  onChange={(e) => setHuntId(e.target.value)}
                  placeholder="UUID"
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="period-start">Period start (optional)</Label>
              <Input id="period-start" type="datetime-local" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-end">Period end (optional)</Label>
              <Input id="period-end" type="datetime-local" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <Button disabled={busy} onClick={() => void onRunReport()} className="w-full">
              Run report
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center gap-2">
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="New template name"
                />
                <Button variant="outline" disabled={busy} onClick={() => void onCreateTemplate()}>
                  Add
                </Button>
              </div>
              <ul className="space-y-1 text-sm">
                {templates.map((tpl) => (
                  <li key={tpl.id} className="rounded-md border border-border px-2 py-1">
                    {tpl.name}
                  </li>
                ))}
                {templates.length === 0 ? (
                  <li className="text-muted-foreground">No custom templates yet.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export history</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div key={job.id} className="rounded-md border border-border p-2 text-sm">
                    <div className="font-medium">
                      {job.report_type} · {job.status}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()} · {job.created_by_email}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!job.pdf_key}
                        onClick={() => void downloadReportArtifact(job.id, 'pdf')}
                      >
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!job.stix_key}
                        onClick={() => void downloadReportArtifact(job.id, 'stix')}
                      >
                        STIX
                      </Button>
                    </div>
                    {job.error ? <p className="mt-1 text-xs text-destructive">{job.error}</p> : null}
                  </div>
                ))}
                {jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No report jobs in this workspace yet.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 grid gap-2 md:grid-cols-3">
                <Input value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} placeholder="Schedule name" />
                <Input
                  value={scheduleInterval}
                  onChange={(e) => setScheduleInterval(e.target.value)}
                  placeholder="Interval minutes"
                />
                <Button variant="outline" disabled={busy} onClick={() => void onCreateSchedule()}>
                  Save schedule
                </Button>
              </div>
              <div className="space-y-2">
                {schedules.map((sch) => (
                  <div key={sch.id} className="rounded-md border border-border p-2 text-sm">
                    <div className="font-medium">{sch.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {sch.report_type} · every {sch.interval_minutes}m · next{' '}
                      {sch.next_run_at ? new Date(sch.next_run_at).toLocaleString() : 'n/a'}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => void runReportScheduleNow(sch.id).then(load)}
                    >
                      Run now
                    </Button>
                  </div>
                ))}
                {schedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No schedules configured.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
