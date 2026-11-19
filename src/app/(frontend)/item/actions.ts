'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { getUser } from '@/lib/auth/session'
import { createItemAs, setArchivedAs, updateItemAs } from '@/lib/item/save'
import type { ItemActionResult } from '@/lib/item/types'

/*
 * The item actions only check the session and call the core in `src/lib/item/save.ts`.
 * After a success, the client calls `router.replace`. The page is dynamic and the client router
 * keeps no dynamic data (`staleTimes.dynamic` is 0), so the page renders fresh data. Thus the
 * actions do not call `refresh()`.
 */

/** ERR-5: no valid session. The client opens the login page. */
const SESSION_EXPIRED: ItemActionResult = { ok: false, reason: 'session-expired' }

/** Creates an item (ITEM-11). */
export async function createItem(raw: unknown): Promise<ItemActionResult> {
  const user = await getUser()
  if (!user) return SESSION_EXPIRED
  return createItemAs(await getPayload({ config }), user, raw)
}

/** Updates an item in one update (ITEM-6). */
export async function updateItem(id: unknown, raw: unknown): Promise<ItemActionResult> {
  const user = await getUser()
  if (!user) return SESSION_EXPIRED
  return updateItemAs(await getPayload({ config }), user, id, raw)
}

/** Archives or unarchives an item (ITEM-8, ITEM-9). */
export async function setArchived(id: unknown, archived: unknown): Promise<ItemActionResult> {
  const user = await getUser()
  if (!user) return SESSION_EXPIRED
  return setArchivedAs(await getPayload({ config }), user, id, archived)
}
