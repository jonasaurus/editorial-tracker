import type { BoardItem } from '@/lib/dashboard/board'
import { getItemMode, getLockedStatuses } from '@/lib/item/abilities'
import { STATUS_LABELS, type ItemStatus, type Role } from '@/lib/items'

/** A drop: the item gets the new status (DND-1). */
export type Move = { id: number; status: ItemStatus }

/** Why a move failed, for the toast (DND-4, ERR-2). */
export type MoveFailure =
  { reason: 'rejected'; message: string } | { reason: 'invalid' } | { reason: 'no-response' }

/** The steps of a drag that the screen reader announces (DND-5). */
export type MoveEvent = 'start' | 'over' | 'end' | 'cancel'

/** DND-5: the screen-reader instructions on a movable item. Words: design-system §8. */
export const MOVE_INSTRUCTIONS =
  'Press Enter to open the item. To move it, press Space. Use the Left and Right arrow keys to choose a column. Press Space again to drop it, or press Escape to cancel.'

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

/** The optimistic state: the item gets the new status. An unknown id gives the same list. */
export function applyMove(items: BoardItem[], move: Move): BoardItem[] {
  return items.map((item) => (item.id === move.id ? { ...item, status: move.status } : item))
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
