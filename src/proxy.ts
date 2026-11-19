import { NextResponse, type NextRequest } from 'next/server'

/**
 * The session cookie: `<cookiePrefix>-token`. The prefix is Payload's default (`payload`).
 * The proxy does not import the Payload config, so the name is a constant here.
 */
const SESSION_COOKIE = 'payload-token'

/**
 * An optimistic check (LOGIN-3, ERR-5): a page request without a session cookie goes to the
 * login page. The real check is `getUser` in the page, because a cookie can be expired or revoked.
 *
 * - The proxy never sends a user away from `/login`. With an expired cookie, that would loop.
 * - Only GET and HEAD. A Server Action is a POST to the page URL, and a 307 redirect keeps the
 *   POST, so the action would fail. Each action checks the session itself.
 */
export function proxy(request: NextRequest) {
  const { method, nextUrl, headers, cookies } = request
  if (method !== 'GET' && method !== 'HEAD') return NextResponse.next()
  if (headers.has('next-action')) return NextResponse.next()
  if (cookies.has(SESSION_COOKIE)) return NextResponse.next()
  if (nextUrl.pathname === '/login') return NextResponse.next()

  const login = new URL('/login', nextUrl)
  login.searchParams.set('next', nextUrl.pathname + nextUrl.search)
  return NextResponse.redirect(login)
}

export const config = {
  // Not: the REST API and the Admin panel (their own auth), Next.js assets, and files.
  matcher: '/((?!(?:api|admin)(?:/|$)|_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
}
