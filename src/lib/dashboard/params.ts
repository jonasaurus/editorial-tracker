import { type ItemStatus, type ItemType, type Role, STATUSES, TYPES } from '@/lib/items'

export type DashboardView = 'board' | 'list'

/** The sortable list columns (LIST-2, LIST-3), in column order. `creator` is "Created by". */
export const LIST_SORTS = ['title', 'type', 'status', 'authors', 'creator', 'deadline'] as const
export type ListSort = (typeof LIST_SORTS)[number]

export type SortDir = 'asc' | 'desc'

/**
 * The dashboard state in the URL (DASH-1, DASH-2, LIST-1, LIST-3). Session 6 adds `item`;
 * `dashboardHref` writes every key.
 */
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
}

/** The first value of a param. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function isItemType(value: string | undefined): value is ItemType {
  return TYPES.some((type) => type === value)
}

function isItemStatus(value: string | undefined): value is ItemStatus {
  return STATUSES.some((status) => status === value)
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
  const view = first(searchParams.view)
  const type = first(searchParams.type)
  const status = first(searchParams.status)
  const sort = first(searchParams.sort)
  const dir = first(searchParams.dir)
  return {
    view: view === 'list' ? 'list' : 'board',
    type: isItemType(type) ? type : null,
    // DASH-2: only editors filter by author.
    author: role === 'editor' ? parseId(first(searchParams.author)) : null,
    archived: first(searchParams.archived) === '1',
    // Read in both views: the board keeps them, so the list restores the tab and sort.
    status: isItemStatus(status) ? status : null,
    sort: isListSort(sort) ? sort : DEFAULTS.sort,
    dir: dir === 'desc' ? 'desc' : 'asc',
  }
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
