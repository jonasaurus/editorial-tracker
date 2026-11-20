import { isItemStatus, isItemType, type ItemStatus, type ItemType, type Role } from '@/lib/items'

export type DashboardView = 'board' | 'list'

/** The sortable list columns (LIST-2, LIST-3), in column order. `creator` is "Created by". */
export const LIST_SORTS = ['title', 'type', 'status', 'authors', 'creator', 'deadline'] as const
export type ListSort = (typeof LIST_SORTS)[number]

export type SortDir = 'asc' | 'desc'

/**
 * The item dialog in the URL (ITEM-1): `item=new`, `item=<id>`, or a value that is not valid.
 * `invalid` shows Not found (ITEM-12) and is not written back to links.
 */
export type ItemParam = { kind: 'new' } | { kind: 'id'; id: number } | { kind: 'invalid' }

/** The dashboard state in the URL (DASH-1, DASH-2, LIST-1, LIST-3, ITEM-1). `dashboardHref` writes every key. */
export type DashboardParams = {
  view: DashboardView
  type: ItemType | null
  /** A user id. Editors only (DASH-2). */
  author: number | null
  /** Show archived (DASH-5). In the URL as `archived=1`. */
  archived: boolean
  /** The list status tab (LIST-1). `null` is the All tab. */
  status: ItemStatus | null
  /** The list sort column (LIST-3). Default `deadline`. */
  sort: ListSort
  /** The list sort direction (LIST-3). Default `asc`. */
  dir: SortDir
  /** The open item dialog (ITEM-1). `null`: no dialog. */
  item: ItemParam | null
}

export type SearchParams = Record<string, string | string[] | undefined>

const DEFAULTS: DashboardParams = {
  view: 'board',
  type: null,
  author: null,
  archived: false,
  status: null,
  sort: 'deadline',
  dir: 'asc',
  item: null,
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function isListSort(value: string | undefined): value is ListSort {
  return LIST_SORTS.some((sort) => sort === value)
}

/** A positive safe integer in plain digits, else null. */
function parseId(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

/** Reads the dashboard params. Unknown or bad values give the default. */
export function parseDashboardParams(searchParams: SearchParams, role: Role): DashboardParams {
  const view = firstValue(searchParams.view)
  const type = firstValue(searchParams.type)
  const status = firstValue(searchParams.status)
  const sort = firstValue(searchParams.sort)
  const dir = firstValue(searchParams.dir)
  return {
    view: view === 'list' ? 'list' : 'board',
    type: isItemType(type) ? type : null,
    // DASH-2: only editors filter by author.
    author: role === 'editor' ? parseId(firstValue(searchParams.author)) : null,
    archived: firstValue(searchParams.archived) === '1',
    // Read in both views: the board keeps them, so the list restores the tab and sort.
    status: isItemStatus(status) ? status : null,
    sort: isListSort(sort) ? sort : DEFAULTS.sort,
    dir: dir === 'desc' ? 'desc' : 'asc',
    // ITEM-1: read for both roles and both views. Access decides what the dialog shows.
    item: parseItem(firstValue(searchParams.item)),
  }
}

/** ITEM-1, ITEM-12: missing or empty is no dialog. Any other bad value is `invalid`. */
function parseItem(value: string | undefined): ItemParam | null {
  if (value === undefined || value === '') return null
  if (value === 'new') return { kind: 'new' }
  const id = parseId(value)
  return id === null ? { kind: 'invalid' } : { kind: 'id', id }
}

/** The dashboard URL for `current` with `change` applied. Default values are not in the URL. */
export function dashboardHref(current: DashboardParams, change: Partial<DashboardParams>): string {
  const params = { ...current, ...change }
  const query = new URLSearchParams()
  if (params.view !== DEFAULTS.view) query.set('view', params.view)
  if (params.type !== null) query.set('type', params.type)
  if (params.author !== null) query.set('author', String(params.author))
  if (params.archived) query.set('archived', '1')
  if (params.status !== null) query.set('status', params.status)
  if (params.sort !== DEFAULTS.sort) query.set('sort', params.sort)
  if (params.dir !== DEFAULTS.dir) query.set('dir', params.dir)
  // ITEM-1: `item` is the last key. An `invalid` value is not written back.
  if (params.item?.kind === 'new') query.set('item', 'new')
  if (params.item?.kind === 'id') query.set('item', String(params.item.id))
  const text = query.toString()
  return text ? `/?${text}` : '/'
}

/** True when a Type or Author filter is set (EMPTY-3, DASH-4 "of N"). */
export function hasFilters(params: DashboardParams): boolean {
  return params.type !== null || params.author !== null
}

/**
 * The sort after a click on the header of `column` (LIST-3): the same column flips the
 * direction, another column starts ascending.
 */
export function nextSort(
  current: Pick<DashboardParams, 'sort' | 'dir'>,
  column: ListSort,
): Pick<DashboardParams, 'sort' | 'dir'> {
  if (current.sort === column) {
    return { sort: column, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  }
  return { sort: column, dir: 'asc' }
}
