import { getDeadlineState } from '@/lib/deadline'
import { type ItemStatus, type ItemType, STATUSES } from '@/lib/items'
import type { ContentItem, User } from '@/payload-types'

/** The view data of one item on the board. No Payload documents and no emails go to the client. */
export type BoardItem = {
  id: number
  title: string
  type: ItemType
  status: ItemStatus
  deadline: string | null
  archived: boolean
  /** Names of the authors, in the stored order. */
  authorNames: string[]
  creatorName: string | null
}

export type BoardColumn = {
  status: ItemStatus
  /** Active items by deadline, then archived items by deadline. */
  items: BoardItem[]
  /** Active (not archived) items (BOARD-1). */
  count: number
  archivedCount: number
}

export type Board = {
  /** One column per status, in `STATUSES` order. */
  columns: BoardColumn[]
  /** Active items on the board. */
  shown: number
  /** Active items with deadline state `overdue` (DL-5). */
  overdue: number
  /** Archived items on the board. */
  archived: number
}

export type CountParts = {
  /** "14 items", "1 item", or "0 of 14 items" when filters hide items. */
  items: string
  /** "2 overdue", or null when 0. */
  overdue: string | null
  /** "1 archived", only while Show archived is on and n > 0. */
  archived: string | null
}

/** The name of a populated user, else null. */
function userName(value: number | User | null | undefined): string | null {
  return typeof value === 'object' && value !== null ? value.name : null
}

/** Maps a content item with populated users (depth 1) to view data. Unpopulated ids are skipped. */
export function toBoardItem(doc: ContentItem): BoardItem {
  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    deadline: doc.deadline || null,
    archived: doc.archived === true,
    authorNames: (doc.authors ?? []).flatMap((author) => userName(author) ?? []),
    creatorName: userName(doc.createdBy),
  }
}

const titleCollator = new Intl.Collator('en')

/** BOARD-2: earliest deadline first, no deadline last. Ties: title, then id. */
export function compareByDeadline(a: BoardItem, b: BoardItem): number {
  if (a.deadline !== b.deadline) {
    if (a.deadline === null) return 1
    if (b.deadline === null) return -1
    // Plain `YYYY-MM-DD` strings sort in date order.
    return a.deadline < b.deadline ? -1 : 1
  }
  return titleCollator.compare(a.title, b.title) || a.id - b.id
}

/** Groups items into status columns and counts them (BOARD-1, BOARD-2, DL-5). */
export function buildBoard(items: BoardItem[], today: string): Board {
  const columns = STATUSES.map((status): BoardColumn => {
    const inColumn = items.filter((item) => item.status === status)
    const active = inColumn.filter((item) => !item.archived).sort(compareByDeadline)
    const archived = inColumn.filter((item) => item.archived).sort(compareByDeadline)
    return {
      status,
      items: [...active, ...archived],
      count: active.length,
      archivedCount: archived.length,
    }
  })
  const active = items.filter((item) => !item.archived)
  return {
    columns,
    shown: active.length,
    // DL-5: the same rule as the cards.
    overdue: active.filter((item) => getDeadlineState(item, today) === 'overdue').length,
    archived: items.length - active.length,
  }
}

/** DASH-4: the app bar counts. `total` = all active items the user can read, with no filters. */
export function formatCounts(input: {
  shown: number
  total: number
  overdue: number
  archived: number
  showArchived: boolean
}): CountParts {
  const { shown, total, overdue, archived, showArchived } = input
  // The noun agrees with the last number.
  const last = shown < total ? total : shown
  const noun = last === 1 ? 'item' : 'items'
  return {
    items: shown < total ? `${shown} of ${total} ${noun}` : `${shown} ${noun}`,
    overdue: overdue > 0 ? `${overdue} overdue` : null,
    archived: showArchived && archived > 0 ? `${archived} archived` : null,
  }
}

/** The column count (BOARD-1): "3", and "1 archived" when the column shows archived items. */
export function formatColumnCount(
  count: number,
  archivedCount: number,
): { count: string; archived: string | null } {
  return {
    count: String(count),
    archived: archivedCount > 0 ? `${archivedCount} archived` : null,
  }
}
