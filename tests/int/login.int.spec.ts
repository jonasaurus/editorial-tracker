import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { authenticate, revokeSession } from '@/lib/auth/authenticate'
import { sessionCookie, sessionCookieName } from '@/lib/auth/cookie'

import { createUser, rest, TEST_PASSWORD } from './helpers'

let payload: Payload
let count = 0

beforeAll(async () => {
  payload = await getPayload({ config })
})

/** A fresh contributor, so that login attempts and sessions of one test do not affect another. */
async function freshUser() {
  count += 1
  return createUser(payload, {
    name: `Login ${count}`,
    email: `login-${count}@example.com`,
    role: 'contributor',
  })
}

async function loginToken(email: string): Promise<string> {
  const result = await authenticate(payload, email, TEST_PASSWORD)
  if (!result.ok) throw new Error(`Login failed for ${email}: ${result.reason}`)
  return result.token
}

const jwtHeaders = (token: string) => new Headers({ Authorization: `JWT ${token}` })

describe('Auth config', () => {
  it('sets an 8-hour session, the lockout defaults and secure off without COOKIE_SECURE', () => {
    const auth = payload.collections.users.config.auth
    expect(auth.tokenExpiration).toBe(28_800)
    expect(auth.maxLoginAttempts).toBe(5)
    expect(auth.lockTime).toBe(600_000)
    expect(auth.cookies.secure).toBe(false)
  })
})

describe('LOGIN-1 login', () => {
  it('LOGIN-1 a correct login gives a token for the same user', async () => {
    const user = await freshUser()
    const token = await loginToken(user.email)
    const { user: authUser } = await payload.auth({ headers: jwtHeaders(token) })
    expect(authUser?.id).toBe(user.id)
  })

  it('LOGIN-1 the token works as the payload-token cookie, also with an Origin header', async () => {
    // A Server Action redirect sends the cookie and the Origin. With `csrf` empty, Payload
    // accepts every Origin. The test fails when `csrf` or `serverURL` is set.
    const user = await freshUser()
    const token = await loginToken(user.email)
    const headers = new Headers({
      Cookie: `${sessionCookieName(payload.config.cookiePrefix)}=${token}`,
      Origin: 'http://localhost:3000',
    })
    const { user: authUser } = await payload.auth({ headers })
    expect(authUser?.id).toBe(user.id)
  })

  it('LOGIN-1 the session cookie is httpOnly, payload-token, lax, and expires in 8 hours', () => {
    const before = Date.now()
    const cookie = sessionCookie(
      payload.collections.users.config.auth,
      payload.config.cookiePrefix,
      'a-token',
    )
    expect(cookie).toMatchObject({
      name: 'payload-token',
      value: 'a-token',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
    })
    const expires = cookie.expires?.getTime() ?? 0
    // `toUTCString` drops the milliseconds.
    expect(expires).toBeGreaterThanOrEqual(before + 28_800_000 - 1000)
    expect(expires).toBeLessThanOrEqual(Date.now() + 28_800_000)
  })
})

describe('LOGIN-2 the same result for a wrong email or password', () => {
  it('LOGIN-2 unknown email, wrong password and empty password all give invalid', async () => {
    const user = await freshUser()
    expect(await authenticate(payload, 'nobody@example.com', TEST_PASSWORD)).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(await authenticate(payload, user.email, 'wrong-password')).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(await authenticate(payload, user.email, '')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('LOGIN-2 REST gives the same 401 body for an unknown email and a wrong password', async () => {
    const user = await freshUser()
    const unknown = await rest('POST', null, ['users', 'login'], {
      body: { email: 'nobody@example.com', password: TEST_PASSWORD },
    })
    const wrong = await rest('POST', null, ['users', 'login'], {
      body: { email: user.email, password: 'wrong-password' },
    })
    expect(unknown.status).toBe(401)
    expect(wrong).toEqual(unknown)
  })
})

describe('LOGIN-4 lockout', () => {
  // Each test uses its own user: when the lock starts, Payload also deletes the sessions of
  // that user from the last 20 seconds.
  it('LOGIN-4 attempts 1 to 5 give invalid, attempt 6 gives locked, even with the correct password', async () => {
    const user = await freshUser()
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect(await authenticate(payload, user.email, 'wrong-password')).toEqual({
        ok: false,
        reason: 'invalid',
      })
    }
    expect(await authenticate(payload, user.email, TEST_PASSWORD)).toEqual({
      ok: false,
      reason: 'locked',
    })
  })

  it('LOGIN-4 REST also locks the account after 5 failed logins', async () => {
    const user = await freshUser()
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await rest('POST', null, ['users', 'login'], {
        body: { email: user.email, password: 'wrong-password' },
      })
    }
    expect(await authenticate(payload, user.email, TEST_PASSWORD)).toEqual({
      ok: false,
      reason: 'locked',
    })
  })

  it('LOGIN-4 an unknown email never locks', async () => {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      expect(await authenticate(payload, 'nobody-lock@example.com', 'wrong-password')).toEqual({
        ok: false,
        reason: 'invalid',
      })
    }
  })
})

describe('Logout', () => {
  it('revokes only the session of the token, and a second logout does not throw', async () => {
    const user = await freshUser()
    const tokenA = await loginToken(user.email)
    const tokenB = await loginToken(user.email)

    await revokeSession(payload, jwtHeaders(tokenA))

    expect((await payload.auth({ headers: jwtHeaders(tokenA) })).user).toBeNull()
    expect((await payload.auth({ headers: jwtHeaders(tokenB) })).user?.id).toBe(user.id)
    await expect(revokeSession(payload, jwtHeaders(tokenA))).resolves.toBeUndefined()
  })

  it('does nothing for a garbage token', async () => {
    await expect(revokeSession(payload, jwtHeaders('not-a-token'))).resolves.toBeUndefined()
  })

  it('REST logout also revokes the token', async () => {
    const user = await freshUser()
    const token = await loginToken(user.email)
    const response = await rest('POST', { user, token }, ['users', 'logout'])
    expect(response.status).toBe(200)
    expect((await payload.auth({ headers: jwtHeaders(token) })).user).toBeNull()
  })
})
