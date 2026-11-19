import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import { loginPath } from './next-path'

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

/**
 * The logged-in user. Without a valid session, opens the login page and returns to `next`
 * after login (LOGIN-3, ERR-5). `next` is the current page with its query.
 */
export async function requireUser(next: string) {
  const user = await getUser()
  if (!user) redirect(loginPath(next))
  return user
}
