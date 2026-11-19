import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Props = {
  /** The state, for example "No drafts". */
  title: string
  /** The next step. */
  text: string
  /** An optional action, for example a "Clear filters" button. */
  action?: ReactNode
  className?: string
}

/** An empty state: dashed box, the state, then the next step (design-system §7). */
export function EmptyState({ title, text, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border border-dashed border-input px-3.5 py-4',
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{text}</p>
      </div>
      {action}
    </div>
  )
}
