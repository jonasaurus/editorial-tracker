import type { ItemStatus, Role } from '@/lib/items'

import type { ItemDetail } from './types'

/**
 * How the dialog shows an item.
 * `edit`: the form can change the item.
 * `archived`: read-only, banner, Unarchive (ITEM-8).
 * `published-read-only`: a contributor's own published item (PERM-2).
 */
export type ItemMode = 'edit' | 'archived' | 'published-read-only'

export type ItemAbilities = {
  mode: ItemMode
  /** Steps the user cannot select (ITEM-4). */
  lockedStatuses: ItemStatus[]
  canArchive: boolean
  canUnarchive: boolean
  /** Authors the user cannot remove (AUTH-1, AUTH-2). */
  lockedAuthorIds: number[]
}

/**
 * The UI mirror of the server rules (PERM-8). `item` null: a new item.
 * The server checks every change again (`rules.ts` and the collection access).
 */
export function getItemAbilities(
  user: { id: number; role: Role },
  item: ItemDetail | null,
): ItemAbilities {
  const isEditor = user.role === 'editor'
  // PERM-3, ITEM-4: only editors publish.
  const lockedStatuses: ItemStatus[] = isEditor ? [] : ['published']
  const none = { canArchive: false, canUnarchive: false }

  // AUTH-1: the creator is always an author of a new item. The server adds it back anyway.
  if (!item) return { mode: 'edit', lockedStatuses, ...none, lockedAuthorIds: [user.id] }

  // PERM-6, ITEM-8: an archived item is read-only. PERM-5: only an editor unarchives a
  // published item.
  if (item.archived) {
    return {
      mode: 'archived',
      lockedStatuses,
      canArchive: false,
      canUnarchive: isEditor || item.status !== 'published',
      lockedAuthorIds: [],
    }
  }

  // PERM-2, ITEM-8a: a contributor cannot change a published item.
  if (!isEditor && item.status === 'published') {
    return { mode: 'published-read-only', lockedStatuses, ...none, lockedAuthorIds: [] }
  }

  // AUTH-2: a contributor who is an author cannot remove themselves. AUTH-3: editors can.
  const isAuthor = item.authors.some((author) => author.id === user.id)
  return {
    mode: 'edit',
    lockedStatuses,
    canArchive: true,
    canUnarchive: false,
    lockedAuthorIds: !isEditor && isAuthor ? [user.id] : [],
  }
}
