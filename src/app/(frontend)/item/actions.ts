'use server'

import config from '@payload-config'
import { refresh } from 'next/cache'
import { getPayload } from 'payload'

import { getUser } from '@/lib/auth/session'
import { createItemAs, moveItemAs, setArchivedAs, updateItemAs } from '@/lib/item/save'
import type { ItemActionResult } from '@/lib/item/types'

/*
 * The item actions only check the session and call the core in `src/lib/item/save.ts`.
 * After a success, the action calls `refresh()`. This clears the client router's history cache
 * (BFCache): without it, Back to an older dashboard URL shows the items as they were before the
 * save. The client then calls `router.replace` to close the dialog (ITEM-2, ITEM-7).
 */

/** ERR-5: no valid session. The client opens the login page. */
const SESSION_EXPIRED: ItemActionResult = { ok: false, reason: 'session-expired' }

/** Refreshes the client router after a success, so no cached page shows old data. */
function refreshOnSuccess(result: ItemActionResult): ItemActionResult {
  if (result.ok) refresh()
  return result
}

/** Creates an item (ITEM-11). */
export async function createItem(raw: unknown): Promise<ItemActionResult> {
  const user = await getUser()
  if (!user) return SESSION_EXPIRED
  return refreshOnSuccess(await createItemAs(await getPayload({ config }), user, raw))
}

/** Updates an item in one update (ITEM-6). */
export async function updateItem(id: unknown, raw: unknown): Promise<ItemActionResult> {
  const user = await getUser()
  if (!user) return SESSION_EXPIRED
  return refreshOnSuccess(await updateItemAs(await getPayload({ config }), user, id, raw))
}

/** Archives or unarchives an item (ITEM-8, ITEM-9). */
export async function setArchived(id: unknown, archived: unknown): Promise<ItemActionResult> {
  const user = await getUser()
  if (!user) return SESSION_EXPIRED
  return refreshOnSuccess(await setArchivedAs(await getPayload({ config }), user, id, archived))
}

/** Moves an item to another status: a drop on the board (DND-1). */
export async function moveItem(id: unknown, status: unknown): Promise<ItemActionResult> {
  const user = await getUser()
  if (!user) return SESSION_EXPIRED
  return refreshOnSuccess(await moveItemAs(await getPayload({ config }), user, id, status))
}
