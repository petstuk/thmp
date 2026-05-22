import type { ReactNode } from 'react'

/** Renders @[label](user:uuid) tokens as chips; legacy @uuid also supported. */
export function renderCommentMentions(body: string): ReactNode {
  const re = /@\[([^\]]+)\]\(user:([0-9a-f-]{36})\)|@([0-9a-f-]{36})\b/gi
  const parts: ReactNode[] = []
  let last = 0
  for (const m of body.matchAll(re)) {
    const idx = m.index ?? 0
    if (idx > last) parts.push(body.slice(last, idx))
    if (m[1] && m[2]) {
      parts.push(
        <span
          key={`${idx}-${m[2]}`}
          className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
          title={m[2]}
        >
          @{m[1]}
        </span>,
      )
    } else if (m[3]) {
      parts.push(
        <span
          key={`${idx}-raw`}
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
          title={m[3]}
        >
          @{m[3].slice(0, 8)}…
        </span>,
      )
    }
    last = idx + m[0].length
  }
  if (last < body.length) parts.push(body.slice(last))
  return parts.length ? <>{parts}</> : body
}
