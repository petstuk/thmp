import { cn } from '@/lib/utils'

type Props = {
  title: string
  hint?: string
  className?: string
}

export function SectionTitle({ title, hint, className }: Props) {
  return (
    <div className={cn('mb-3 flex items-baseline gap-2', className)}>
      <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  )
}
