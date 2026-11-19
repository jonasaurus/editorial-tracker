import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import { loginPath } from './next-path'

/**
 * The session of this request: the logged-in user (or null when the session cookie is missing,
 * expired, invalid or revoked) and the Admin panel permission (ROLE-3).
 * This is the real session check. The proxy only checks that the cookie exists.
 * `cache` runs `payload.auth` once per request.
 */
export const getSession = cache(async () => {
  // Read the headers first: this makes the page dynamic before Payload connects to the
  // database. Otherwise `next build` prerenders the page and connects at build time.
  const requestHeaders = await headers()
  const payload = await getPayload({ config })
  const { user, permissions } = await payload.auth({ headers: requestHeaders })
  // Payload removes `canAccessAdmin` from the permissions when it is false.
  return { user, canAccessAdmin: permissions.canAccessAdmin === true }
})

/** The logged-in user, or null. */
export async function getUser() {
  return (await getSession()).user
}

/**
 * The session with a logged-in user. Without a valid session, opens the login page and
 * returns to `next` after login (LOGIN-3, ERR-5). `next` is the current page with its query.
 */
export async function requireSession(next: string) {
  const session = await getSession()
  const { user } = session
  if (!user) redirect(loginPath(next))
  return { ...session, user }
}
