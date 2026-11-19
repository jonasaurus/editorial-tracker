import { BoardDnd } from '@/components/dashboard/board-dnd'
import { NoItemsState, NoResultsState } from '@/components/dashboard/empty-state'
import type { BoardItem } from '@/lib/dashboard/board'
import type { Role } from '@/lib/items'
import { cn } from '@/lib/utils'

/**
 * The empty state of the whole board.
 * `no-items`: the user can read no items at all (EMPTY-1).
 * `no-results`: filters are set and hide all items (EMPTY-3). `total` = all active items.
 */
export type BoardEmpty =
  { kind: 'none' } | { kind: 'no-items' } | { kind: 'no-results'; total: number; clearHref: string }

type Props = {
  /** The items on the board. The client groups them into columns (BOARD-1). */
  items: BoardItem[]
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  empty: BoardEmpty
  /** The role of the user: which items move and where (DND-1, DND-2). */
  role: Role
  /** The URL that opens an item in the dialog (BOARD-4, ITEM-1). */
  itemHref: (id: number) => string
  className?: string
}

/** The board view: four status columns (BOARD-1). Stacked below `md`. */
export function Board({ items, today, empty, role, itemHref, className }: Props) {
  // A function cannot go to a Client Component: pass the URLs.
  const hrefs = Object.fromEntries(items.map((item) => [item.id, itemHref(item.id)]))

  return (
    <div className={cn('px-4 pt-6 pb-10 md:px-10', className)}>
      <BoardDnd
        items={items}
        today={today}
        role={role}
        hrefs={hrefs}
        showEmptyState={empty.kind === 'none'}
      />

      {empty.kind === 'no-items' && <NoItemsState className="mt-3" />}

      {empty.kind === 'no-results' && (
        <NoResultsState className="mt-3" total={empty.total} clearHref={empty.clearHref} />
      )}
    </div>
  )
}
