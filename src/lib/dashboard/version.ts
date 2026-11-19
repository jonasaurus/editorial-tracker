import type { Endpoint, Payload } from 'payload'

import type { User } from '@/payload-types'

import { todayInCopenhagen } from '../deadline'
import { formatVersion } from './live'

/**
 * LIVE-1: the version of the items this user can read (archived included, no filters).
 * Reads as the user, so a contributor's version follows own items only (PERM-1).
 * One `find` gives both values: `totalDocs` is the count, the first doc has the latest `updatedAt`.
 */
export async function getDashboardVersion(payload: Payload, user: User): Promise<string> {
  const result = await payload.find({
    collection: 'content-items',
    user,
    overrideAccess: false,
    sort: '-updatedAt',
    limit: 1,
    depth: 0,
    select: { updatedAt: true },
  })
  return formatVersion(todayInCopenhagen(), result.totalDocs, result.docs[0]?.updatedAt ?? null)
}

/** The version can change at any time, so no cache may keep a response. */
const noStore = { 'Cache-Control': 'no-store' }

/**
 * `GET /api/content-items/version` (LIVE-1). 401 without a session.
 * Else 200 `{ version }`, never cached.
 * Uses `req.payload`, not `@payload-config`: the config imports this file.
 */
export const versionEndpoint: Endpoint = {
  path: '/version',
  method: 'get',
  handler: async (req) => {
    const { user } = req
    if (!user || user.collection !== 'users') {
      return Response.json({ message: 'Not logged in.' }, { status: 401, headers: noStore })
    }
    const version = await getDashboardVersion(req.payload, user)
    return Response.json({ version }, { headers: noStore })
  },
}
