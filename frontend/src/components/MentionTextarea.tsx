import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'

export type WorkspaceMemberPick = {
  id: string
  display_name: string
  email: string
}

type Props = {
  id?: string
  value: string
  onChange: (v: string) => void
  members: WorkspaceMemberPick[]
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

export function MentionTextarea({
  id,
  value,
  onChange,
  members,
  placeholder,
  className,
  disabled,
  required,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const [open, setOpen] = useState(false)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [highlight, setHighlight] = useState(0)

  const filtered = members.filter((m) => {
    const q = filter.toLowerCase()
    if (!q) return true
    return (
      m.display_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    )
  })

  const insertMention = useCallback(
    (m: WorkspaceMemberPick) => {
      if (mentionStart === null) return
      const el = taRef.current
      const end = el?.selectionStart ?? value.length
      const before = value.slice(0, mentionStart)
      const after = value.slice(end)
      const token = `@[${m.display_name}](user:${m.id})`
      const next = `${before}${token} ${after}`
      onChange(next)
      setOpen(false)
      setMentionStart(null)
      setFilter('')
      requestAnimationFrame(() => {
        const pos = before.length + token.length + 1
        el?.focus()
        el?.setSelectionRange(pos, pos)
      })
    },
    [mentionStart, onChange, value],
  )

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      insertMention(filtered[highlight]!)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setMentionStart(null)
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={taRef}
        id={id}
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={className}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          const next = e.target.value
          onChange(next)
          const pos = e.target.selectionStart
          const slice = next.slice(0, pos)
          const at = slice.lastIndexOf('@')
          if (at >= 0) {
            const frag = slice.slice(at + 1)
            if (!frag.includes(' ') && !frag.includes('\n')) {
              setMentionStart(at)
              setFilter(frag)
              setHighlight(0)
              setOpen(true)
              return
            }
          }
          setOpen(false)
          setMentionStart(null)
        }}
      />
      {open && filtered.length > 0 ? (
        <ul
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover text-sm shadow-md"
          role="listbox"
        >
          {filtered.slice(0, 12).map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                className={`flex w-full flex-col px-3 py-2 text-left hover:bg-muted ${
                  i === highlight ? 'bg-muted' : ''
                }`}
                onMouseDown={(ev) => {
                  ev.preventDefault()
                  insertMention(m)
                }}
              >
                <span className="font-medium">{m.display_name}</span>
                <span className="text-xs text-muted-foreground">{m.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
