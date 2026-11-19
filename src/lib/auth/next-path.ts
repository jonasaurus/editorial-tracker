/** A base to parse relative paths. Only the origin check uses it. */
const BASE = 'http://app.invalid'

/** First path segments that `next` must not point to: a loop, or routes with their own auth. */
const BLOCKED_SEGMENTS = new Set(['login', 'api', 'admin'])

/**
 * The page to open after login (LOGIN-3). Returns a path on this site, or `/`.
 * Reason: `next` comes from the URL, so it must not send the user to another site.
 * Returns the parsed path, not the raw value: the browser parses it the same way.
 */
export function safeNextPath(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || !value.startsWith('/')) return '/'
  let url: URL
  try {
    url = new URL(value, BASE)
  } catch {
    return '/'
  }
  if (url.origin !== BASE) return '/'
  const path = url.pathname + url.search + url.hash
  if (path.startsWith('//') || path.startsWith('/\\')) return '/'
  const firstSegment = url.pathname.split('/')[1] ?? ''
  if (BLOCKED_SEGMENTS.has(firstSegment)) return '/'
  return path
}

/** Builds `pathname?query` from Next.js `searchParams`. Repeated keys stay repeated. */
export function toPathWithQuery(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item)
  }
  const search = query.toString()
  return search ? `${pathname}?${search}` : pathname
}

/** The login URL that returns to `next` after login (LOGIN-3, ERR-5). */
export function loginPath(next: string): string {
  const safe = safeNextPath(next)
  return safe === '/' ? '/login?next=%2F' : `/login?next=${encodeURIComponent(safe)}`
}
