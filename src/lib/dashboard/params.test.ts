import { describe, expect, it } from 'vitest'

import { dashboardHref, type DashboardParams, hasFilters, parseDashboardParams } from './params'

const DEFAULTS: DashboardParams = { view: 'board', type: null, author: null, archived: false }

describe('parseDashboardParams', () => {
  it('gives the defaults for no params', () => {
    expect(parseDashboardParams({}, 'editor')).toEqual(DEFAULTS)
    expect(parseDashboardParams({}, 'contributor')).toEqual(DEFAULTS)
  })

  it('reads all params (DASH-1, DASH-2, DASH-5)', () => {
    expect(
      parseDashboardParams({ view: 'list', type: 'video', author: '12', archived: '1' }, 'editor'),
    ).toEqual({ view: 'list', type: 'video', author: 12, archived: true })
  })

  it.each([['board'], ['list']] as const)('reads view=%s', (view) => {
    expect(parseDashboardParams({ view }, 'editor').view).toBe(view)
  })

  it.each([['table'], [''], ['List'], ['board ']])('ignores view=%j', (view) => {
    expect(parseDashboardParams({ view }, 'editor').view).toBe('board')
  })

  it.each([['article'], ['video'], ['podcast'], ['newsletter']] as const)(
    'reads type=%s',
    (type) => {
      expect(parseDashboardParams({ type }, 'contributor').type).toBe(type)
    },
  )

  it.each([['blog'], [''], ['Article'], ['toString'], ['__proto__']])('ignores type=%j', (type) => {
    expect(parseDashboardParams({ type }, 'editor').type).toBeNull()
  })

  it.each([
    ['1', 1],
    ['42', 42],
    ['9007199254740991', 9007199254740991],
  ])('reads author=%s for an editor', (author, expected) => {
    expect(parseDashboardParams({ author }, 'editor').author).toBe(expected)
  })

  it.each([
    ['0'],
    ['-1'],
    ['1e3'],
    ['01'],
    ['1.5'],
    ['1.0'],
    [' 1'],
    ['+1'],
    ['0x10'],
    ['abc'],
    [''],
    ['9007199254740992'],
    ['99999999999999999999'],
  ])('ignores author=%j', (author) => {
    expect(parseDashboardParams({ author }, 'editor').author).toBeNull()
  })

  it('ignores the author for a contributor (DASH-2)', () => {
    expect(parseDashboardParams({ author: '3' }, 'contributor').author).toBeNull()
  })

  it.each([
    ['1', true],
    ['0', false],
    ['true', false],
    ['', false],
    ['11', false],
  ] as const)('reads archived=%j as %s', (archived, expected) => {
    expect(parseDashboardParams({ archived }, 'editor').archived).toBe(expected)
  })

  it('uses the first value of an array', () => {
    expect(
      parseDashboardParams(
        {
          view: ['list', 'board'],
          type: ['podcast', 'video'],
          author: ['7', '8'],
          archived: ['1', '0'],
        },
        'editor',
      ),
    ).toEqual({ view: 'list', type: 'podcast', author: 7, archived: true })
  })

  it('gives the default when the first value of an array is bad', () => {
    expect(
      parseDashboardParams({ view: ['x', 'list'], type: [], author: ['0', '7'] }, 'editor'),
    ).toEqual(DEFAULTS)
  })

  it('ignores unknown keys', () => {
    expect(parseDashboardParams({ foo: 'bar', item: '3' }, 'editor')).toEqual(DEFAULTS)
  })
})

describe('dashboardHref', () => {
  it('gives "/" for the defaults', () => {
    expect(dashboardHref(DEFAULTS, {})).toBe('/')
  })

  it('writes the keys in a fixed order', () => {
    expect(
      dashboardHref(DEFAULTS, { archived: true, author: 5, type: 'video', view: 'list' }),
    ).toBe('/?view=list&type=video&author=5&archived=1')
  })

  it('applies the change to the current params', () => {
    const current: DashboardParams = { view: 'list', type: 'article', author: 2, archived: false }
    expect(dashboardHref(current, { type: 'podcast' })).toBe('/?view=list&type=podcast&author=2')
  })

  it('drops the default values', () => {
    const current: DashboardParams = { view: 'list', type: 'article', author: 2, archived: true }
    expect(
      dashboardHref(current, { view: 'board', type: null, author: null, archived: false }),
    ).toBe('/')
  })

  it('writes Show archived as archived=1', () => {
    expect(dashboardHref(DEFAULTS, { archived: true })).toBe('/?archived=1')
  })

  it('does not change the current params', () => {
    const current: DashboardParams = { ...DEFAULTS }
    dashboardHref(current, { view: 'list' })
    expect(current).toEqual(DEFAULTS)
  })

  it.each<DashboardParams>([
    DEFAULTS,
    { view: 'list', type: null, author: null, archived: false },
    { view: 'board', type: 'newsletter', author: null, archived: false },
    { view: 'board', type: null, author: 9, archived: false },
    { view: 'board', type: null, author: null, archived: true },
    { view: 'list', type: 'video', author: 123, archived: true },
  ])('round-trips %j', (params) => {
    const href = dashboardHref(params, {})
    const query = Object.fromEntries(new URL(href, 'http://localhost').searchParams)
    expect(parseDashboardParams(query, 'editor')).toEqual(params)
  })
})

describe('hasFilters', () => {
  it.each<[string, Partial<DashboardParams>, boolean]>([
    ['no filters', {}, false],
    ['the list view', { view: 'list' }, false],
    ['Show archived only', { archived: true }, false],
    ['a type', { type: 'video' }, true],
    ['an author', { author: 4 }, true],
    ['a type and an author', { type: 'article', author: 4 }, true],
  ])('checks %s', (_name, change, expected) => {
    expect(hasFilters({ ...DEFAULTS, ...change })).toBe(expected)
  })
})
