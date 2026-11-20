import { type BoardColumn, type BoardItem, compareInColumn } from '@/lib/dashboard/board'
import type { PlainDate } from '@/lib/deadline'
import { getItemMode, getLockedStatuses } from '@/lib/item/abilities'
import { isItemStatus, STATUS_LABELS, type ItemStatus, type Role } from '@/lib/items'

/**
 * A drop: the item gets the new status (DND-1). `at`: the time of the drop as an ISO timestamp,
 * the optimistic `publishedAt` of a move to Published (MODEL-2).
 */
export type Move = { id: number; status: ItemStatus; at: string }

/** Why a move failed, for the toast (DND-4, ERR-2). */
export type MoveFailure =
  { reason: 'rejected'; message: string } | { reason: 'invalid' } | { reason: 'no-response' }

/** The steps of a drag that the screen reader announces (DND-5). */
export type MoveEvent = 'start' | 'over' | 'end' | 'cancel'

/** DND-5: the screen-reader instructions on a movable item. Words: design-system §8. */
export const MOVE_INSTRUCTIONS =
  'Press Enter to open the item. To move it, press Space. Use the Left and Right arrow keys to choose a column. Press Space again to drop it, or press Escape to cancel.'

/** The data that a dragged item carries (DND-1, DND-5). `deadline`: for the drop place (BOARD-2). */
export type ItemDragData = { title: string; status: ItemStatus; deadline: PlainDate | null }

/** Narrows the `data` of a drag source to `ItemDragData`. The library types it as unknown. */
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

/** DND-1, PERM-2, PERM-6: only items that the user can edit move. */
export function canMoveItem(role: Role, item: Pick<BoardItem, 'archived' | 'status'>): boolean {
  return getItemMode(role, item) === 'edit'
}

/** DND-2: a column accepts a drop when its status is not locked and is not the item's status. */
export function canDropOn(
  role: Role,
  item: Pick<BoardItem, 'status'>,
  status: ItemStatus,
): boolean {
  return status !== item.status && !getLockedStatuses(role).includes(status)
}

/**
 * The drop slot of a column during a drag (design-system §4 "Drop targets").
 * `locked`: the user cannot drop here (DND-2). `publish`: the item is over Published (DND-3).
 * `move`: the item is over another column. Null: no slot.
 */
export type DropSlotKind = 'locked' | 'publish' | 'move' | null

export function getDropSlot(
  role: Role,
  drag: Pick<BoardItem, 'status'> | null,
  status: ItemStatus,
  isDropTarget: boolean,
): DropSlotKind {
  if (drag === null || drag.status === status) return null
  if (!canDropOn(role, drag, status)) return 'locked'
  if (!isDropTarget) return null
  return status === 'published' ? 'publish' : 'move'
}

/**
 * The optimistic state: the item gets the new status. A move to Published also sets `publishedAt`,
 * as the server does (MODEL-2). An unknown id gives the same list.
 */
export function applyMove(items: BoardItem[], move: Move): BoardItem[] {
  return items.map((item) => {
    if (item.id !== move.id) return item
    const publishedAt = move.status === 'published' ? move.at : item.publishedAt
    return { ...item, status: move.status, publishedAt }
  })
}

/**
 * Where a dropped item lands in a column: the index of the drop slot among the column's items
 * (BOARD-2, design-system "Drop targets"). The item goes before the archived items. In Published it
 * is first: the server sets `publishedAt` to now, the newest value (MODEL-2).
 */
export function getDropIndex(
  column: Pick<BoardColumn, 'status' | 'items' | 'count'>,
  item: Pick<BoardItem, 'id' | 'title' | 'deadline'>,
): number {
  if (column.status === 'published') return 0
  const compare = compareInColumn(column.status)
  const moved = { ...item, publishedAt: null }
  // `count` active items come first in `items` (buildBoard).
  return column.items.slice(0, column.count).filter((other) => compare(other, moved) < 0).length
}

/** A sentence ends with a period. */
const withPeriod = (text: string) => (text.endsWith('.') ? text : `${text}.`)

/** DND-4, ERR-2: the toast text after a failed move. */
export function getMoveError(
  failure: MoveFailure,
  from: ItemStatus,
): { title: 'Item not moved'; text: string } {
  const back = `The item went back to ${STATUS_LABELS[from]}.`
  switch (failure.reason) {
    case 'rejected':
      return { title: 'Item not moved', text: `${withPeriod(failure.message)} ${back}` }
    case 'invalid':
      return { title: 'Item not moved', text: `The move is not valid. ${back}` }
    case 'no-response':
      return { title: 'Item not moved', text: `The server did not respond. ${back} Try again.` }
  }
}

/** DND-5: the announcement for one step of a drag. `to`: the column under the item, or null. */
export function announceMove(
  event: MoveEvent,
  title: string,
  from: ItemStatus,
  to: ItemStatus | null,
): string {
  const name = `Item "${title}"`
  const stays = `${name} stays in ${STATUS_LABELS[from]}.`
  switch (event) {
    case 'start':
      return `Picked up item "${title}" in ${STATUS_LABELS[from]}.`
    case 'over':
      return to ? `${name} is over ${STATUS_LABELS[to]}.` : `${name} is not over a column.`
    case 'end':
      return to && to !== from ? `${name} dropped in ${STATUS_LABELS[to]}.` : stays
    case 'cancel':
      return `The move is cancelled. ${stays}`
  }
}
