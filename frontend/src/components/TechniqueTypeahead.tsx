import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '../api'

export type TechniqueSummary = {
  id: string
  mitre_id: string
  name: string
  is_subtechnique: boolean
}

export type TechniqueEntry = { id: string; label: string }

type Props = {
  entries: TechniqueEntry[]
  onChange: (entries: TechniqueEntry[]) => void
  disabled?: boolean
}

export function TechniqueTypeahead({ entries, onChange, disabled }: Props) {
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState<TechniqueSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSuggestions = useCallback(async (term: string) => {
    const t = term.trim()
    if (t.length < 1) {
      setSuggestions([])
      setFetchError(null)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: t, limit: '20' })
      const data = (await apiFetch(`/api/v1/attack/techniques?${params.toString()}`)) as TechniqueSummary[]
      setSuggestions(Array.isArray(data) ? data : [])
      setFetchError(null)
    } catch (err) {
      setSuggestions([])
      setFetchError(
        err instanceof Error ? err.message : 'ATT&CK technique search failed (check login and catalogue sync).',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void loadSuggestions(q)
    }, 280)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q, loadSuggestions])

  function addSummary(s: TechniqueSummary) {
    if (entries.some((e) => e.id === s.id)) return
    const label = `${s.mitre_id} — ${s.name}${s.is_subtechnique ? ' (sub)' : ''}`
    onChange([...entries, { id: s.id, label }])
    setQ('')
    setSuggestions([])
    setOpen(false)
  }

  function removeId(id: string) {
    onChange(entries.filter((e) => e.id !== id))
  }

  return (
    <div className="relative flex flex-col gap-2 text-sm">
      <span className="text-sm font-medium text-muted-foreground">ATT&CK techniques</span>
      <div className="flex flex-wrap gap-2 rounded-lg border border-input bg-background px-2 py-2 dark:bg-input/30">
        {entries.map((e) => (
          <span
            key={e.id}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
            title={e.id}
          >
            <span className="truncate">{e.label}</span>
            {!disabled ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-5 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Remove technique"
                onClick={() => removeId(e.id)}
              >
                ×
              </Button>
            ) : null}
          </span>
        ))}
        {!disabled ? (
          <Input
            className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-0.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
            placeholder="Search by name or T-code…"
            value={q}
            onChange={(e) => {
              const v = e.target.value
              setQ(v)
              setOpen(true)
              if (!v.trim()) setFetchError(null)
            }}
            onFocus={() => setOpen(true)}
          />
        ) : null}
      </div>
      {fetchError && q.trim().length >= 1 ? (
        <p className="text-xs text-destructive">{fetchError}</p>
      ) : null}
      {!disabled && open && (q.trim().length >= 1 || loading) && !fetchError ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md">
          {loading ? <li className="px-3 py-2 text-xs text-muted-foreground">Loading…</li> : null}
          {!loading && !fetchError && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">No matches</li>
          ) : null}
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                onClick={() => addSummary(s)}
              >
                <span className="font-mono text-primary">{s.mitre_id}</span> {s.name}
                {s.is_subtechnique ? <span className="text-muted-foreground"> (sub)</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
