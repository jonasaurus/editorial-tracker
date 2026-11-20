import type { SanitizedCollectionConfig } from 'payload'
import { generatePayloadCookie } from 'payload/shared'

/** The options that `cookies().set` takes. */
export type SessionCookie = {
  name: string
  value: string
  domain?: string
  expires?: Date
  httpOnly: boolean
  path: string
  sameSite?: 'lax' | 'strict' | 'none'
  secure: boolean
}

/** Payload writes `Lax`. `cookies().set` takes `lax`. */
const SAME_SITE = { Lax: 'lax', Strict: 'strict', None: 'none' } as const

/** The name of the session cookie (`payload-token` with the default prefix). */
export const sessionCookieName = (cookiePrefix: string): string => `${cookiePrefix}-token`

/**
 * The session cookie for a token (LOGIN-1). Payload builds it from the collection auth config,
 * so the app and the Admin panel use the same cookie.
 */
export function sessionCookie(
  authConfig: SanitizedCollectionConfig['auth'],
  cookiePrefix: string,
  token: string,
): SessionCookie {
  const cookie = generatePayloadCookie({
    collectionAuthConfig: authConfig,
    cookiePrefix,
    token,
    returnCookieAsObject: true,
  })
  return {
    name: cookie.name,
    value: token,
    domain: cookie.domain,
    expires: cookie.expires ? new Date(cookie.expires) : undefined,
    httpOnly: true,
    path: cookie.path ?? '/',
    sameSite: cookie.sameSite && SAME_SITE[cookie.sameSite],
    secure: cookie.secure ?? false,
  }
}
