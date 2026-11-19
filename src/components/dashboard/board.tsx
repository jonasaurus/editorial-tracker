import Link from 'next/link'

import { BoardColumn } from '@/components/dashboard/board-column'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Button } from '@/components/ui/button'
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
  className?: string
}

/** The board view: four status columns (BOARD-1). Stacked below `md`. */
export function Board({ board, today, empty, className }: Props) {
  return (
    <div className={cn('px-4 pt-6 pb-10 md:px-10', className)}>
      <div className="grid gap-x-4 gap-y-8 md:grid-cols-4">
        {board.columns.map((column) => (
          <BoardColumn
            key={column.status}
            column={column}
            today={today}
            showEmptyState={empty.kind === 'none'}
          />
        ))}
      </div>

      {empty.kind === 'no-items' && (
        <EmptyState
          className="mt-3"
          title="No items yet"
          text="Create the first item with “New item” at the top right."
        />
      )}

      {empty.kind === 'no-results' && (
        <EmptyState
          className="mt-3"
          title="No items match these filters"
          text={`Change the filters, or clear them to see all ${empty.total} ${empty.total === 1 ? 'item' : 'items'}.`}
          action={
            <Button asChild variant="outline" size="sm" className="border-input text-sm">
              <Link href={empty.clearHref} scroll={false}>
                Clear filters
              </Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
