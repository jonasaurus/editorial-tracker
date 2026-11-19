import { describe, expect, it } from 'vitest'

import { loginPath, safeNextPath, toPathWithQuery } from './next-path'

describe('safeNextPath (LOGIN-3)', () => {
  it.each([
    ['/', '/'],
    ['/?view=list&item=3', '/?view=list&item=3'],
    ['/?view=board#top', '/?view=board#top'],
    ['/login-help', '/login-help'],
    ['/apiary', '/apiary'],
    // The browser does not decode %2F in a path, so this stays on this site.
    ['/%2F%2Fevil.example', '/%2F%2Fevil.example'],
  ])('keeps the path on this site: %s', (raw, expected) => {
    expect(safeNextPath(raw)).toBe(expected)
  })

  it.each([
    ['empty', ''],
    ['undefined', undefined],
    ['a relative path', 'view=list'],
    ['another site', 'https://evil.example/'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash', '/\\evil.example'],
    ['a tab', '/\t/evil.example'],
    ['a newline', '/\n/evil.example'],
    ['the login page', '/login'],
    ['the login page with a next', '/login?next=/'],
    ['a login subpath', '/login/x'],
    ['the API', '/api/users'],
    ['the Admin panel', '/admin'],
    ['javascript', 'javascript:alert(1)'],
  ])('returns / for %s', (_name, raw) => {
    expect(safeNextPath(raw)).toBe('/')
  })

  it('uses the first value of an array', () => {
    expect(safeNextPath(['/?view=list', 'https://evil.example'])).toBe('/?view=list')
  })
})

describe('toPathWithQuery', () => {
  it('returns the path without a query', () => {
    expect(toPathWithQuery('/', {})).toBe('/')
  })

  it('encodes values and keeps repeated keys', () => {
    expect(toPathWithQuery('/', { view: 'list', type: ['video', 'podcast'], x: undefined })).toBe(
      '/?view=list&type=video&type=podcast',
    )
  })
})

describe('loginPath (ERR-5)', () => {
  it('encodes next', () => {
    expect(loginPath('/?view=list&item=3')).toBe('/login?next=%2F%3Fview%3Dlist%26item%3D3')
  })

  it('falls back to / for an unsafe next', () => {
    expect(loginPath('https://evil.example')).toBe('/login?next=%2F')
  })
})
