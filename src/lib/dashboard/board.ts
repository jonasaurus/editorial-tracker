import { getDeadlineState, type IsoTimestamp, type PlainDate } from '@/lib/deadline'
import { type ItemStatus, type ItemType, STATUSES } from '@/lib/items'
import type { ContentItem, User } from '@/payload-types'

/** The view data of one item on the board. No Payload documents and no emails go to the client. */
export type BoardItem = {
  id: number
  title: string
  type: ItemType
  status: ItemStatus
  deadline: PlainDate | null
  /** The server sets it on each change to Published (MODEL-2). */
  publishedAt: IsoTimestamp | null
  archived: boolean
  /** Names of the authors, in the stored order. */
  authorNames: string[]
  creatorName: string | null
}

export type BoardColumn = {
  status: ItemStatus
  /** Active items, then archived items, each in the BOARD-2 order of the column. */
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
    publishedAt: doc.publishedAt ?? null,
    archived: doc.archived === true,
    authorNames: (doc.authors ?? []).flatMap((author) => userName(author) ?? []),
    creatorName: userName(doc.createdBy),
  }
}

const titleCollator = new Intl.Collator('en')

/** The fields that the BOARD-2 sort uses. */
type SortFields = Pick<BoardItem, 'id' | 'title' | 'deadline' | 'publishedAt'>

/** Ties: title, then id (stable order between loads). */
function compareByTitle(a: SortFields, b: SortFields): number {
  return titleCollator.compare(a.title, b.title) || a.id - b.id
}

/** BOARD-2: earliest deadline first, no deadline last. Ties: title, then id. */
export function compareByDeadline(a: SortFields, b: SortFields): number {
  if (a.deadline !== b.deadline) {
    if (a.deadline === null) return 1
    if (b.deadline === null) return -1
    // Plain `YYYY-MM-DD` strings sort in date order.
    return a.deadline < b.deadline ? -1 : 1
  }
  return compareByTitle(a, b)
}

/** BOARD-2, Published column: newest `publishedAt` first, none last. Ties: title, then id. */
export function compareByPublished(a: SortFields, b: SortFields): number {
  if (a.publishedAt !== b.publishedAt) {
    if (a.publishedAt === null) return 1
    if (b.publishedAt === null) return -1
    // The server writes every value as `toISOString()` (same length, UTC), so strings sort in time order.
    return a.publishedAt > b.publishedAt ? -1 : 1
  }
  return compareByTitle(a, b)
}

/** BOARD-2: the sort of one column. */
export function compareInColumn(status: ItemStatus): (a: SortFields, b: SortFields) => number {
  return status === 'published' ? compareByPublished : compareByDeadline
}

/** Groups items into status columns and counts them (BOARD-1, BOARD-2, DL-5). */
export function buildBoard(items: BoardItem[], today: PlainDate): Board {
  const columns = STATUSES.map((status): BoardColumn => {
    const inColumn = items.filter((item) => item.status === status)
    const compare = compareInColumn(status)
    const active = inColumn.filter((item) => !item.archived).sort(compare)
    const archived = inColumn.filter((item) => item.archived).sort(compare)
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
