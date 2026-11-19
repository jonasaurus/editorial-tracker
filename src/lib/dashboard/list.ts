import { type ItemStatus, STATUSES, TYPE_LABELS } from '@/lib/items'

import { type BoardItem, compareByDeadline } from './board'
import type { DashboardParams, ListSort, SortDir } from './params'

/** A list status tab (LIST-1). `status: null` is the All tab. */
export type ListTab = {
  status: ItemStatus | null
  /** Active (not archived) items in the tab, after the Type and Author filters. */
  count: number
  /** Archived items in the tab. 0 while Show archived is off (they are not loaded). */
  archivedCount: number
}

export type List = {
  /** All, then one tab per status in `STATUSES` order. */
  tabs: ListTab[]
  /** The items of the selected tab: active rows, then archived rows, each group sorted (LIST-3, LIST-4). */
  rows: BoardItem[]
}

const collator = new Intl.Collator('en')

/** The sort value of an item for a column. `null` is an empty value. */
function sortValue(item: BoardItem, sort: ListSort): string | number | null {
  switch (sort) {
    case 'title':
      return item.title
    case 'type':
      return TYPE_LABELS[item.type]
    case 'status':
      return STATUSES.indexOf(item.status)
    case 'authors':
      return item.authorNames.length > 0 ? item.authorNames.join(', ') : null
    case 'creator':
      return item.creatorName
    case 'deadline':
      return item.deadline
  }
}

/** Ascending order of two non-empty values of one column. */
function compareValues(a: string | number, b: string | number, sort: ListSort): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (sort === 'deadline') {
    // Plain `YYYY-MM-DD` strings sort in date order.
    return a < b ? -1 : a > b ? 1 : 0
  }
  return collator.compare(String(a), String(b))
}

/**
 * The list order (LIST-3). `dir` reverses the sort column only. Empty values (no deadline,
 * no authors, no creator) come last in both directions. Ties: `compareByDeadline`.
 */
export function compareForList(
  sort: ListSort,
  dir: SortDir,
): (a: BoardItem, b: BoardItem) => number {
  const sign = dir === 'asc' ? 1 : -1
  return (a, b) => {
    const valueA = sortValue(a, sort)
    const valueB = sortValue(b, sort)
    if (valueA === null || valueB === null) {
      // Empty values last, in both directions.
      if (valueA !== valueB) return valueA === null ? 1 : -1
    } else {
      const order = compareValues(valueA, valueB, sort)
      if (order !== 0) return sign * order
    }
    return compareByDeadline(a, b)
  }
}

/** Builds the status tabs and the sorted rows of the list view (LIST-1, LIST-3, LIST-4). */
export function buildList(
  items: BoardItem[],
  params: Pick<DashboardParams, 'status' | 'sort' | 'dir'>,
): List {
  const compare = compareForList(params.sort, params.dir)
  const inTab = (status: ItemStatus | null) =>
    items.filter((item) => status === null || item.status === status)
  const tabs = [null, ...STATUSES].map((status): ListTab => {
    const tabItems = inTab(status)
    const archivedCount = tabItems.filter((item) => item.archived).length
    return { status, count: tabItems.length - archivedCount, archivedCount }
  })
  const rows = inTab(params.status)
  // LIST-4: archived rows after the active rows (same as BOARD-2).
  const active = rows.filter((item) => !item.archived).sort(compare)
  const archived = rows.filter((item) => item.archived).sort(compare)
  return { tabs, rows: [...active, ...archived] }
}

/**
 * The empty state of the list, in this order:
 * `no-items`: the user can read no item at all (EMPTY-1).
 * `no-results`: Type or Author filters are set and hide all items (EMPTY-3).
 * `empty-tab`: the selected tab has no rows (EMPTY-2). `status: null` is the All tab
 * (only archived items exist and Show archived is off).
 * `none`: the list has rows.
 */
export type ListEmpty =
  | { kind: 'none' }
  | { kind: 'no-items' }
  | { kind: 'no-results' }
  | { kind: 'empty-tab'; status: ItemStatus | null }

export function getListEmpty(input: {
  /** False when the user can read no item at all, archived included. */
  hasAnyItem: boolean
  /** Type or Author filter set (`hasFilters`). */
  filtered: boolean
  /** Loaded items in all tabs (after filters and Show archived). */
  itemCount: number
  /** Rows in the selected tab. */
  rowCount: number
  status: ItemStatus | null
}): ListEmpty {
  if (!input.hasAnyItem) return { kind: 'no-items' }
  if (input.filtered && input.itemCount === 0) return { kind: 'no-results' }
  if (input.rowCount === 0) return { kind: 'empty-tab', status: input.status }
  return { kind: 'none' }
}
