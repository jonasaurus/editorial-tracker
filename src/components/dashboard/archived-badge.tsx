import { Archive } from 'lucide-react'

import { cn } from '@/lib/utils'

/** LIST-4, BOARD-3: a label, so the archived state is not colour only. */
export function ArchivedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-input px-1.5 text-xs leading-4 text-muted-foreground',
        className,
      )}
    >
      <Archive aria-hidden className="size-3" />
      Archived
    </span>
  )
}
