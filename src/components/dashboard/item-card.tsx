import { Archive } from 'lucide-react'

import { DeadlineText } from '@/components/deadline-text'
import type { BoardItem } from '@/lib/dashboard/board'
import { TYPE_LABELS } from '@/lib/items'
import { cn } from '@/lib/utils'

type Props = {
  item: BoardItem
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
}

/** "Sara Nielsen, Jonas Berg · created by Mette Holm", or "Created by Mette Holm" with no authors. */
function byline(authorNames: string[], creatorName: string | null): string | null {
  const authors = authorNames.join(', ')
  if (creatorName === null) return authors || null
  return authors ? `${authors} · created by ${creatorName}` : `Created by ${creatorName}`
}

/** An item on the board (BOARD-3). */
export function ItemCard({ item, today }: Props) {
  const people = byline(item.authorNames, item.creatorName)

  return (
    <article
      className={cn(
        'border p-3.5',
        item.archived ? 'border-dashed border-input' : 'border-border bg-card',
      )}
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2 text-muted-foreground">
          {TYPE_LABELS[item.type]}
          {item.archived && (
            <span className="inline-flex items-center gap-1 rounded-full border border-input px-1.5 leading-4">
              <Archive aria-hidden className="size-3" />
              Archived
            </span>
          )}
        </span>
        <DeadlineText item={item} today={today} variant="short" />
      </div>
      <h3
        className={cn(
          'mt-1.5 text-sm font-semibold',
          item.archived ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {item.title}
      </h3>
      {people && <p className="mt-1.5 text-xs text-muted-foreground">{people}</p>}
    </article>
  )
}
