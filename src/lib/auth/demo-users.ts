import { DEMO_PASSWORD, DEMO_USERS } from '@/seed/seed'

/** The demo users for the login screen (ROLE-4). */
export type DemoLogins = {
  users: readonly { name: string; email: string; role: 'editor' | 'contributor' }[]
  password: string
}

/**
 * ROLE-4: the login screen lists the demo users in development only.
 * `NODE_ENV` is `development` only in `pnpm dev` (`production` in `next build`, `pnpm start`
 * and Docker, `test` in Vitest), so production pages never contain demo data.
 */
export function demoLoginsFor(nodeEnv: string | undefined): DemoLogins | undefined {
  if (nodeEnv !== 'development') return undefined
  return { users: DEMO_USERS, password: DEMO_PASSWORD }
}
