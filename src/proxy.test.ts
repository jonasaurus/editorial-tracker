import { getRedirectUrl, unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { config, proxy } from './proxy'

const request = (path: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), init)

const withCookie = { headers: { cookie: 'payload-token=abc' } }

describe('proxy (LOGIN-3, ERR-5)', () => {
  it('sends a page request without a session cookie to the login page', () => {
    expect(getRedirectUrl(proxy(request('/')))).toBe('http://localhost:3000/login?next=%2F')
  })

  it('keeps the query in next', () => {
    expect(getRedirectUrl(proxy(request('/?view=list&item=3')))).toBe(
      'http://localhost:3000/login?next=%2F%3Fview%3Dlist%26item%3D3',
    )
  })

  it('lets a request with a session cookie pass (the page checks it)', () => {
    expect(getRedirectUrl(proxy(request('/', withCookie)))).toBeNull()
  })

  it('never redirects the login page, also with a cookie', () => {
    expect(getRedirectUrl(proxy(request('/login')))).toBeNull()
    expect(getRedirectUrl(proxy(request('/login', withCookie)))).toBeNull()
  })

  it('lets a Server Action POST pass, so the action can answer', () => {
    const action = request('/', { method: 'POST', headers: { 'next-action': 'abc' } })
    expect(getRedirectUrl(proxy(action))).toBeNull()
  })
})

describe('proxy matcher', () => {
  it.each(['/', '/login', '/apiary', '/?view=list'])('runs on %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true)
  })

  it.each([
    '/admin',
    '/admin/collections/users',
    '/api/users',
    '/_next/static/x.js',
    '/favicon.ico',
    '/logo.svg',
  ])('skips %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false)
  })
})
