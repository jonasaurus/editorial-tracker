import { loginPath } from '@/lib/auth/next-path'

/** ERR-3: the toast when the user can no longer read the item. */
export const NO_ACCESS_MESSAGE = 'You no longer have access to this item.'

/** ERR-5: the login URL that comes back to the current page. Browser only. */
export function currentLoginPath(): string {
  return loginPath(window.location.pathname + window.location.search)
}
