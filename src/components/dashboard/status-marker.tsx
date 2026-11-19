import type { ItemStatus } from '@/lib/items'
import { cn } from '@/lib/utils'

const fill: Record<ItemStatus, string> = {
  idea: 'bg-status-idea',
  draft: 'bg-status-draft',
  review: 'bg-status-review',
  published: 'bg-status-published',
}

type Props = {
  status: ItemStatus
  className?: string
}

/**
 * A square in the status colour (design-system §3). Its size is the cap height of the text next
 * to it. Put it in a flex parent with `items-baseline` and `gap-2`, so it sits on the baseline.
 */
export function StatusMarker({ status, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-[0.71em] shrink-0 supports-[height:1cap]:size-[1cap]',
        fill[status],
        className,
      )}
    />
  )
}
