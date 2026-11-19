import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

/**
 * The logged-in user, or null when the session cookie is missing, expired, invalid or revoked.
 * This is the real session check. The proxy only checks that the cookie exists.
 * `cache` runs it once per request.
 */
export const getUser = cache(async () => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return user
})
