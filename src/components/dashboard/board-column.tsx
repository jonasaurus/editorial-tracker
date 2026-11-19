'use client'

import { useDragOperation, useDroppable } from '@dnd-kit/react'
import { ArrowDown, Lock } from 'lucide-react'

import { EmptyState } from '@/components/dashboard/empty-state'
import { DraggableItemCard, ItemCard, isItemDragData } from '@/components/dashboard/item-card'
import { StatusMarker } from '@/components/dashboard/status-marker'
import { formatColumnCount, type BoardColumn as Column } from '@/lib/dashboard/board'
import { canDropOn, canMoveItem } from '@/lib/dashboard/dnd'
import { STATUS_LABELS, type ItemStatus, type Role } from '@/lib/items'
import { cn } from '@/lib/utils'

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

/**
 * The drop slot at the top of a column during a drag (design-system §4 "Drop targets").
 * `locked`: the user cannot drop here (DND-2). `publish`: over Published (DND-3).
 * `move`: over another column.
 */
type Slot = 'locked' | 'publish' | 'move' | null

type Props = {
  column: Column
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  role: Role
  /** The URL that opens each item in the dialog (BOARD-4, ITEM-1). */
  hrefs: Record<number, string>
  /** Show EMPTY-2 when the column has no items. False when the board shows one empty box. */
  showEmptyState?: boolean
}

/** One status column: heading, count, then the items (BOARD-1, BOARD-2, EMPTY-2, DND-2, DND-3). */
export function BoardColumn({ column, today, role, hrefs, showEmptyState = true }: Props) {
  const headingId = `column-${column.status}`
  const { count, archived } = formatColumnCount(column.count, column.archivedCount)
  const { ref, isDropTarget } = useDroppable({ id: column.status })
  const { source } = useDragOperation()

  const drag = isItemDragData(source?.data) ? source.data : null
  const slot: Slot =
    drag === null || drag.status === column.status
      ? null
      : !canDropOn(role, drag, column.status)
        ? 'locked'
        : isDropTarget
          ? column.status === 'published'
            ? 'publish'
            : 'move'
          : null

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      data-board-column={column.status}
      className={cn(
        // The highlight sits outside the column box, so the layout does not move (design 02d).
        '-m-3 min-w-0 border border-transparent p-[11px]',
        slot === 'publish' && 'animate-publish-pulse border-publish/50 bg-publish/10',
        slot === 'locked' && isDropTarget && 'cursor-not-allowed',
      )}
    >
      <div
        className={cn(
          'flex items-baseline justify-between gap-2 border-b pb-2',
          slot === 'publish' ? 'border-publish' : 'border-foreground',
        )}
      >
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

      {slot && <DropSlot slot={slot} status={column.status} />}

      {column.items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {column.items.map((item) => (
            <li key={item.id}>
              {canMoveItem(role, item) ? (
                <DraggableItemCard item={item} today={today} href={hrefs[item.id] ?? ''} />
              ) : (
                <ItemCard item={item} today={today} href={hrefs[item.id] ?? ''} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        showEmptyState && <EmptyState className="mt-3" {...emptyText[column.status]} />
      )}
    </section>
  )
}

/** The dashed slot at the top of a column during a drag (components.png "Drop to publish"). */
function DropSlot({ slot, status }: { slot: NonNullable<Slot>; status: ItemStatus }) {
  const Icon = slot === 'locked' ? Lock : ArrowDown
  const text =
    slot === 'locked'
      ? 'Only editors can publish items'
      : slot === 'publish'
        ? 'Drop to publish'
        : `Move to ${STATUS_LABELS[status]}`

  return (
    <div
      className={cn(
        'mt-3 flex h-18 items-center justify-center gap-1.5 border border-dashed text-sm',
        slot === 'publish'
          ? 'border-publish bg-publish/10 font-semibold text-foreground'
          : slot === 'move'
            ? 'border-input font-semibold text-foreground'
            : 'border-input text-muted-foreground',
      )}
    >
      <Icon aria-hidden className="size-4" />
      {text}
    </div>
  )
}
