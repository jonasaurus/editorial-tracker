import { type ItemType, type Role, TYPES } from '@/lib/items'

export type DashboardView = 'board' | 'list'

/**
 * The dashboard state in the URL (DASH-1, DASH-2). Later sessions add keys
 * (`item`, `sort`, `dir`, `status`); `dashboardHref` writes every key.
 */
export type DashboardParams = {
  view: DashboardView
  type: ItemType | null
  /** A user id. Editors only (DASH-2). */
  author: number | null
  /** Show archived (DASH-5). In the URL as `archived=1`. */
  archived: boolean
}

export type SearchParams = Record<string, string | string[] | undefined>

const DEFAULTS: DashboardParams = { view: 'board', type: null, author: null, archived: false }

/** The first value of a param. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function isItemType(value: string | undefined): value is ItemType {
  return TYPES.some((type) => type === value)
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
  return {
    view: view === 'list' ? 'list' : 'board',
    type: isItemType(type) ? type : null,
    // DASH-2: only editors filter by author.
    author: role === 'editor' ? parseId(first(searchParams.author)) : null,
    archived: first(searchParams.archived) === '1',
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
  const text = query.toString()
  return text ? `/?${text}` : '/'
}

/** True when a Type or Author filter is set (EMPTY-3, DASH-4 "of N"). */
export function hasFilters(params: DashboardParams): boolean {
  return params.type !== null || params.author !== null
}
