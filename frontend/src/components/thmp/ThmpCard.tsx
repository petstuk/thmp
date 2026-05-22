import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  title?: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function ThmpCard({ title, children, className, contentClassName }: Props) {
  return (
    <Card className={cn('border-[color:var(--sidebar-border)] bg-card', className)}>
      {title ? (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide text-card-foreground">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={cn('py-4', contentClassName)}>{children}</CardContent>
    </Card>
  )
}
