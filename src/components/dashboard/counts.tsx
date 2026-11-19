import type { CountParts } from '@/lib/dashboard/board'
import { cn } from '@/lib/utils'

type Props = {
  parts: CountParts
  className?: string
}

/** The app bar counts: "14 items · 2 overdue · 1 archived" (DASH-4). */
export function Counts({ parts, className }: Props) {
  return (
    <p className={cn('text-sm whitespace-nowrap text-muted-foreground', className)}>
      {parts.items}
      {parts.overdue !== null && (
        <>
          {' · '}
          <span className="font-semibold text-destructive">{parts.overdue}</span>
        </>
      )}
      {parts.archived !== null && ` · ${parts.archived}`}
    </p>
  )
}
