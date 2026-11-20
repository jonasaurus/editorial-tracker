import type { Payload } from 'payload'

import type { ItemParam } from '@/lib/dashboard/params'
import { populatedUser } from '@/lib/items'
import type { ContentItem, User } from '@/payload-types'

import type { ItemDetail, ItemDialogState, UserOption } from './types'

/** The users for the author picker, by name (ITEM-3). Only id, name and role: no emails. */
async function getUserOptions(payload: Payload, user: User): Promise<UserOption[]> {
  const { docs } = await payload.find({
    collection: 'users',
    select: { name: true, role: true },
    sort: 'name',
    pagination: false,
    user,
    overrideAccess: false,
  })
  return docs.map(({ id, name, role }) => ({ id, name, role }))
}

/** The item as view data. Authors that are not populated (no read access) are skipped. */
function toItemDetail(item: ContentItem): ItemDetail {
  const authors = (item.authors ?? []).flatMap((value) => {
    const author = populatedUser(value)
    return author ? [{ id: author.id, name: author.name }] : []
  })
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    type: item.type,
    // An empty text field means no deadline (ADR 0007).
    deadline: item.deadline || null,
    archived: item.archived === true,
    authors,
    creatorName: populatedUser(item.createdBy)?.name ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    publishedAt: item.publishedAt ?? null,
  }
}

/**
 * Loads the dialog data as the logged-in user (PERM-8). A missing item and an item without
 * access give the same `not-found` (ITEM-12).
 */
export async function getItemDialogData(
  payload: Payload,
  user: User,
  param: ItemParam,
): Promise<ItemDialogState> {
  switch (param.kind) {
    case 'invalid':
      return { kind: 'not-found' }
    case 'new':
      return { kind: 'new', users: await getUserOptions(payload, user) }
    case 'id': {
      const item = await payload.findByID({
        collection: 'content-items',
        id: param.id,
        depth: 1,
        // Only the names of the users: no emails go to the page.
        populate: { users: { name: true } },
        disableErrors: true,
        user,
        overrideAccess: false,
      })
      if (!item) return { kind: 'not-found' }
      return {
        kind: 'edit',
        item: toItemDetail(item),
        users: await getUserOptions(payload, user),
      }
    }
  }
}
