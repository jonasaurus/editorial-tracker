'use server'

import config from '@payload-config'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { authenticate, revokeSession } from '@/lib/auth/authenticate'
import { sessionCookie, sessionCookieName } from '@/lib/auth/cookie'
import { safeNextPath } from '@/lib/auth/next-path'

import type { LoginState } from './state'

/** LOGIN-2, LOGIN-4: one text for every failed login, so the screen does not show which users exist. */
const LOGIN_ERROR = 'The email or password is not correct.'

const text = (value: FormDataEntryValue | null): string => (typeof value === 'string' ? value : '')

/** Logs in, sets the session cookie, and opens `next` (LOGIN-1, LOGIN-3). */
export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = text(formData.get('email')).trim()
  const password = text(formData.get('password'))
  const payload = await getPayload({ config })

  const result = await authenticate(payload, email, password)
  if (!result.ok) return { email, error: LOGIN_ERROR }

  const { name, value, ...options } = sessionCookie(
    payload.collections.users.config.auth,
    payload.config.cookiePrefix,
    result.token,
  )
  ;(await cookies()).set(name, value, options)
  // `redirect` throws, so it stays outside any try/catch.
  redirect(safeNextPath(text(formData.get('next'))))
}

/** Ends the session on the server, deletes the cookie, and opens the login page (DASH-6). */
export async function logout(): Promise<void> {
  const payload = await getPayload({ config })
  await revokeSession(payload, await headers())
  // Always delete the cookie, also when the token was already expired or revoked.
  ;(await cookies()).delete({
    name: sessionCookieName(payload.config.cookiePrefix),
    path: '/',
    domain: payload.collections.users.config.auth.cookies.domain,
  })
  redirect('/login')
}
