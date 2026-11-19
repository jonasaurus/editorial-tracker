import { EmptyState } from '@/components/dashboard/empty-state'
import { ItemCard } from '@/components/dashboard/item-card'
import { StatusMarker } from '@/components/dashboard/status-marker'
import { formatColumnCount, type BoardColumn as Column } from '@/lib/dashboard/board'
import { STATUS_LABELS, type ItemStatus } from '@/lib/items'

/** EMPTY-2: the text of an empty column. */
const emptyText: Record<ItemStatus, { title: string; text: string }> = {
  idea: { title: 'No ideas', text: 'Add one with New item.' },
  draft: { title: 'No drafts', text: 'Move an idea here when you start writing.' },
  review: {
    title: 'Nothing to review',
    text: 'Move a draft here when it is ready for an editor.',
  },
  published: {
    title: 'Nothing published yet',
    text: 'Move an item to Review. An editor publishes it.',
  },
}

type Props = {
  column: Column
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  /** Show EMPTY-2 when the column has no items. False when the board shows one empty box. */
  showEmptyState?: boolean
}

/** One status column: heading, count, then the items (BOARD-1, BOARD-2, EMPTY-2). */
export function BoardColumn({ column, today, showEmptyState = true }: Props) {
  const headingId = `column-${column.status}`
  const { count, archived } = formatColumnCount(column.count, column.archivedCount)

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 border-b border-foreground pb-2">
        <h2
          id={headingId}
          className="flex items-baseline gap-2 text-2xl font-semibold tracking-[-0.02em] text-foreground"
        >
          <StatusMarker status={column.status} />
          {STATUS_LABELS[column.status]}
        </h2>
        <p className="text-2xl font-light whitespace-nowrap text-muted-foreground">
          {count}
          {/* "3 · 1 archived": the archived part is smaller (design 02c). */}
          {archived && <span className="text-sm font-normal"> · {archived}</span>}
        </p>
      </div>

      {column.items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {column.items.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} today={today} />
            </li>
          ))}
        </ul>
      ) : (
        showEmptyState && <EmptyState className="mt-3" {...emptyText[column.status]} />
      )}
    </section>
  )
}
