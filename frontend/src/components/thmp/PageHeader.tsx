import { cn } from '@/lib/utils'

type Props = {
  title: string
  subtitle?: string
  className?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, className, actions }: Props) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-start justify-between gap-3', className)}>
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
