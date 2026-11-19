import { BoardColumn } from '@/components/dashboard/board-column'
import { NoItemsState, NoResultsState } from '@/components/dashboard/empty-state'
import type { Board as BoardData } from '@/lib/dashboard/board'
import { cn } from '@/lib/utils'

/**
 * The empty state of the whole board.
 * `no-items`: the user can read no items at all (EMPTY-1).
 * `no-results`: filters are set and hide all items (EMPTY-3). `total` = all active items.
 */
export type BoardEmpty =
  { kind: 'none' } | { kind: 'no-items' } | { kind: 'no-results'; total: number; clearHref: string }

type Props = {
  board: BoardData
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  empty: BoardEmpty
  /** The URL that opens an item in the dialog (BOARD-4, ITEM-1). */
  itemHref: (id: number) => string
  className?: string
}

/** The board view: four status columns (BOARD-1). Stacked below `md`. */
export function Board({ board, today, empty, itemHref, className }: Props) {
  return (
    <div className={cn('px-4 pt-6 pb-10 md:px-10', className)}>
      <div className="grid gap-x-4 gap-y-8 md:grid-cols-4">
        {board.columns.map((column) => (
          <BoardColumn
            key={column.status}
            column={column}
            today={today}
            itemHref={itemHref}
            showEmptyState={empty.kind === 'none'}
          />
        ))}
      </div>

      {empty.kind === 'no-items' && <NoItemsState className="mt-3" />}

      {empty.kind === 'no-results' && (
        <NoResultsState className="mt-3" total={empty.total} clearHref={empty.clearHref} />
      )}
    </div>
  )
}
