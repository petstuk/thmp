import { cn } from '@/lib/utils'

export function UserAvatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-full border border-border bg-muted font-mono text-[10px] font-semibold uppercase text-foreground',
        className,
      )}
      aria-hidden
    >
      {initials.slice(0, 2)}
    </div>
  )
}
