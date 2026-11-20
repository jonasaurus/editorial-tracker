import type { Payload, Where } from 'payload'

import type { User } from '@/payload-types'

import { toBoardItem, type BoardItem } from './board'
import { hasFilters, type DashboardParams } from './params'

export type AuthorOption = { id: number; name: string }

export type DashboardData = {
  /** The params in effect. An unknown author id is removed. */
  params: DashboardParams
  /** Items after the Type, Author and Show archived filters (DASH-2, DASH-3, DASH-5). */
  items: BoardItem[]
  /** All active (not archived) items the user can read, with no filters (DASH-4 "of N", EMPTY-3). */
  total: number
  /** False when the user can read no item at all, archived included (EMPTY-1). */
  hasAnyItem: boolean
  /** The Author filter options. Empty for contributors (DASH-2: editors only). */
  authors: AuthorOption[]
}

/** DASH-5: archived items are hidden unless "Show archived" is on. `not_equals` also matches null. */
const ACTIVE: Where = { archived: { not_equals: true } }

/**
 * Loads the dashboard data as the logged-in user (PERM-8). Collection access adds the
 * row scope (PERM-1), so a contributor gets own items only.
 * The board sorts in `buildBoard`, so this query does not sort the items.
 */
export async function getDashboardData(
  payload: Payload,
  user: User,
  requested: DashboardParams,
): Promise<DashboardData> {
  const access = { user, overrideAccess: false } as const

  const authors: AuthorOption[] =
    user.role === 'editor'
      ? (
          await payload.find({
            collection: 'users',
            ...access,
            pagination: false,
            sort: 'name',
            select: { name: true },
          })
        ).docs.map(({ id, name }) => ({ id, name }))
      : []

  const author =
    requested.author !== null && authors.some(({ id }) => id === requested.author)
      ? requested.author
      : null
  const params: DashboardParams = { ...requested, author }

  const conditions: Where[] = []
  if (params.type) conditions.push({ type: { equals: params.type } })
  // DASH-3: the author or the creator. `equals` on `authors` matches one of the authors (API-3).
  if (author !== null) {
    conditions.push({ or: [{ authors: { equals: author } }, { createdBy: { equals: author } }] })
  }
  if (!params.archived) conditions.push(ACTIVE)

  const { docs } = await payload.find({
    collection: 'content-items',
    ...access,
    where: conditions.length > 0 ? { and: conditions } : undefined,
    pagination: false,
    depth: 1,
    // Only the names of the users: no emails go to the page.
    populate: { users: { name: true } },
  })
  const items = docs.map(toBoardItem)

  const activeShown = items.filter((item) => !item.archived).length
  const total = hasFilters(params)
    ? (await payload.count({ collection: 'content-items', ...access, where: ACTIVE })).totalDocs
    : activeShown

  const hasAnyItem =
    items.length > 0 ||
    total > 0 ||
    (await payload.count({ collection: 'content-items', ...access })).totalDocs > 0

  return { params, items, total, hasAnyItem, authors }
}
