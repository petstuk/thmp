import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const sevColor: Record<string, string> = {
  critical: 'bg-[var(--sev-critical-bg)] text-[var(--sev-critical)] border-[color:color-mix(in_oklab,var(--sev-critical)_45%,transparent)]',
  high: 'bg-[var(--sev-high-bg)] text-[var(--sev-high)] border-[color:color-mix(in_oklab,var(--sev-high)_45%,transparent)]',
  medium: 'bg-[var(--sev-medium-bg)] text-[var(--sev-medium)] border-[color:color-mix(in_oklab,var(--sev-medium)_45%,transparent)]',
  low: 'bg-[var(--sev-low-bg)] text-[var(--sev-low)] border-[color:color-mix(in_oklab,var(--sev-low)_45%,transparent)]',
  informational: 'bg-[var(--sev-info-bg)] text-[var(--sev-info)] border-[color:color-mix(in_oklab,var(--sev-info)_45%,transparent)]',
}

const statusColor: Record<string, string> = {
  draft: 'bg-[color:color-mix(in_oklab,var(--status-draft)_14%,transparent)] text-[var(--status-draft)] border-[color:color-mix(in_oklab,var(--status-draft)_45%,transparent)]',
  active: 'bg-[color:color-mix(in_oklab,var(--status-active)_12%,transparent)] text-[var(--status-active)] border-[color:color-mix(in_oklab,var(--status-active)_45%,transparent)]',
  in_hunt: 'bg-[color:color-mix(in_oklab,var(--status-in-hunt)_14%,transparent)] text-[var(--status-in-hunt)] border-[color:color-mix(in_oklab,var(--status-in-hunt)_45%,transparent)]',
  validated: 'bg-[color:color-mix(in_oklab,var(--status-validated)_14%,transparent)] text-[var(--status-validated)] border-[color:color-mix(in_oklab,var(--status-validated)_45%,transparent)]',
  closed: 'bg-[color:color-mix(in_oklab,var(--status-closed)_14%,transparent)] text-[var(--status-closed)] border-[color:color-mix(in_oklab,var(--status-closed)_45%,transparent)]',
  archived: 'bg-[color:color-mix(in_oklab,var(--status-archived)_20%,transparent)] text-[var(--status-archived)] border-[color:color-mix(in_oklab,var(--status-archived)_50%,transparent)]',
}

function titleCase(v: string): string {
  return v.replace(/_/g, ' ')
}

type Props = {
  value: string
  className?: string
}

export function SeverityBadge({ value, className }: Props) {
  const key = value.toLowerCase()
  return (
    <Badge
      variant="outline"
      className={cn('h-5 rounded-sm px-1.5 font-mono text-[10px] uppercase tracking-wide', sevColor[key], className)}
    >
      {titleCase(value)}
    </Badge>
  )
}

export function StatusBadge({ value, className }: Props) {
  const key = value.toLowerCase()
  return (
    <Badge
      variant="outline"
      className={cn('h-5 rounded-sm px-1.5 font-mono text-[10px] uppercase tracking-wide', statusColor[key], className)}
    >
      {titleCase(value)}
    </Badge>
  )
}

export function SupportBadge({ supports, className }: { supports: boolean; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 rounded-sm px-1.5 font-mono text-[10px] uppercase tracking-wide',
        supports
          ? 'bg-[color:color-mix(in_oklab,var(--status-validated)_14%,transparent)] text-[var(--status-validated)] border-[color:color-mix(in_oklab,var(--status-validated)_45%,transparent)]'
          : 'bg-[var(--sev-critical-bg)] text-[var(--sev-critical)] border-[color:color-mix(in_oklab,var(--sev-critical)_45%,transparent)]',
        className,
      )}
    >
      {supports ? 'supports' : 'refutes/neutral'}
    </Badge>
  )
}
