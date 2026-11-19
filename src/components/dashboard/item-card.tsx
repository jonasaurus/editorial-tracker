'use client'

import { useDraggable } from '@dnd-kit/react'
import { Archive } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { DeadlineText } from '@/components/deadline-text'
import type { BoardItem } from '@/lib/dashboard/board'
import { formatPublished } from '@/lib/item/meta'
import { isItemStatus, type ItemStatus, TYPE_LABELS } from '@/lib/items'
import { cn } from '@/lib/utils'

type Props = {
  item: BoardItem
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  /** The URL that opens the item in the dialog (BOARD-4, ITEM-1). */
  href: string
}

/** The data that a dragged item carries (DND-1, DND-5). `deadline`: for the drop place (BOARD-2). */
export type ItemDragData = { title: string; status: ItemStatus; deadline: string | null }

/** Narrows the `data` of a drag source to `ItemDragData`. */
export function isItemDragData(value: unknown): value is ItemDragData {
  if (typeof value !== 'object' || value === null) return false
  return (
    'title' in value &&
    typeof value.title === 'string' &&
    'status' in value &&
    isItemStatus(value.status) &&
    'deadline' in value &&
    (value.deadline === null || typeof value.deadline === 'string')
  )
}

/** "Sara Nielsen, Jonas Berg · created by Mette Holm", or "Created by Mette Holm" with no authors. */
function byline(authorNames: string[], creatorName: string | null): string | null {
  const authors = authorNames.join(', ')
  if (creatorName === null) return authors || null
  return authors ? `${authors} · created by ${creatorName}` : `Created by ${creatorName}`
}

/** The link classes. BOARD-4: the link stretches over the whole card. */
const linkClass = 'outline-none after:absolute after:inset-0'

/** The frame of a card. `ghost`: the item stays in its column during a drag (design 02d). */
function cardClass(item: BoardItem, ghost = false): string {
  return cn(
    'relative border p-3.5 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50',
    ghost
      ? 'border-dashed border-input **:text-muted-foreground!'
      : item.archived
        ? 'border-dashed border-input'
        : 'border-border bg-card hover:border-input',
  )
}

/** The content of a card: type, deadline or published date, title, people (BOARD-3). */
function ItemCardBody({ item, today, title }: Omit<Props, 'href'> & { title: ReactNode }) {
  const people = byline(item.authorNames, item.creatorName)

  return (
    <>
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
        {/* BOARD-3: a published card shows the published date (the Published column sorts by it). */}
        {item.status === 'published' && item.publishedAt ? (
          <time dateTime={item.publishedAt} className="text-muted-foreground">
            {formatPublished(item.publishedAt, today)}
          </time>
        ) : (
          <DeadlineText item={item} today={today} variant="short" />
        )}
      </div>
      <h3
        className={cn(
          'mt-1.5 text-sm font-semibold text-pretty',
          item.archived ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {title}
      </h3>
      {people && <p className="mt-1.5 text-xs text-muted-foreground">{people}</p>}
    </>
  )
}

/**
 * An item on the board that does not move (BOARD-3). BOARD-4: the title link stretches over the
 * whole card, so a click anywhere opens the item. The link name is the title.
 */
export function ItemCard({ item, today, href }: Props) {
  return (
    <article className={cardClass(item)}>
      <ItemCardBody
        item={item}
        today={today}
        title={
          <Link href={href} scroll={false} data-item-link={item.id} className={linkClass}>
            {item.title}
          </Link>
        }
      />
    </article>
  )
}

/**
 * An item that the user can move to another column (DND-1). The title link is the drag handle:
 * a click opens the item, a drag of 5px or Space starts a move.
 */
export function DraggableItemCard({ item, today, href }: Props) {
  const data: ItemDragData = { title: item.title, status: item.status, deadline: item.deadline }
  const { ref, handleRef, isDragSource } = useDraggable({ id: item.id, data })

  return (
    <article ref={ref} className={cardClass(item, isDragSource)}>
      <ItemCardBody
        item={item}
        today={today}
        title={
          <Link
            ref={handleRef}
            href={href}
            scroll={false}
            data-item-link={item.id}
            draggable={false}
            // DND-5: keep link semantics. The drag plugin sets `role="button"` and a
            // "draggable" role description only when the attributes are not there.
            role="link"
            aria-roledescription=""
            className={cn(linkClass, 'cursor-grab')}
          >
            {item.title}
          </Link>
        }
      />
    </article>
  )
}

/** The copy of an item that follows the pointer during a drag (design 02d). Not interactive. */
export function ItemCardOverlay({ item, today }: Omit<Props, 'href'>) {
  return (
    <article aria-hidden inert className={cn(cardClass(item), '-rotate-2 shadow-lg')}>
      <ItemCardBody item={item} today={today} title={item.title} />
    </article>
  )
}
