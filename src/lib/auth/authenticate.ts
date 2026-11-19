import {
  AuthenticationError,
  createLocalReq,
  LockedAuth,
  logoutOperation,
  ValidationError,
  type Payload,
} from 'payload'

/** Why a login failed. The login screen shows the same text for both (LOGIN-2, LOGIN-4). */
export type LoginFailure = 'invalid' | 'locked'

export type LoginResult = { ok: true; token: string } | { ok: false; reason: LoginFailure }

/**
 * Logs in with email and password (LOGIN-1).
 *
 * The auth operations (login, auth, logout) find the user, so they cannot pass `user`.
 * This is the one exception to PERM-8. `overrideAccess: false` still applies the read access.
 */
export async function authenticate(
  payload: Payload,
  email: string,
  password: string,
): Promise<LoginResult> {
  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
      overrideAccess: false,
    })
    if (!result.token) throw new Error('Payload login returned no token')
    return { ok: true, token: result.token }
  } catch (error) {
    // Payload minifies class names in production, so compare classes, not names.
    if (error instanceof LockedAuth) return { ok: false, reason: 'locked' }
    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      return { ok: false, reason: 'invalid' }
    }
    throw error
  }
}

/**
 * Ends the session of the token in `headers`: Payload deletes the session row, so the token
 * stops working. Does nothing when the token is already expired, invalid or revoked.
 */
export async function revokeSession(payload: Payload, headers: Headers): Promise<void> {
  const { user } = await payload.auth({ headers })
  if (!user) return
  const req = await createLocalReq({ user }, payload)
  await logoutOperation({ collection: payload.collections.users, req })
}
