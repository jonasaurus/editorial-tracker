import { describe, expect, it } from 'vitest'

import {
  dashboardHref,
  type DashboardParams,
  hasFilters,
  LIST_SORTS,
  nextSort,
  parseDashboardParams,
} from './params'

const DEFAULTS: DashboardParams = {
  view: 'board',
  type: null,
  author: null,
  archived: false,
  status: null,
  sort: 'deadline',
  dir: 'asc',
  item: null,
}

describe('parseDashboardParams', () => {
  it('gives the defaults for no params', () => {
    expect(parseDashboardParams({}, 'editor')).toEqual(DEFAULTS)
    expect(parseDashboardParams({}, 'contributor')).toEqual(DEFAULTS)
  })

  it('reads all params (DASH-1, DASH-2, DASH-5, LIST-1, LIST-3)', () => {
    expect(
      parseDashboardParams(
        {
          view: 'list',
          type: 'video',
          author: '12',
          archived: '1',
          status: 'review',
          sort: 'title',
          dir: 'desc',
          item: '4',
        },
        'editor',
      ),
    ).toEqual({
      view: 'list',
      type: 'video',
      author: 12,
      archived: true,
      status: 'review',
      sort: 'title',
      dir: 'desc',
      item: { kind: 'id', id: 4 },
    })
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

  it.each([['idea'], ['draft'], ['review'], ['published']] as const)(
    'reads status=%s (LIST-1)',
    (status) => {
      expect(parseDashboardParams({ status }, 'contributor').status).toBe(status)
    },
  )

  it.each([['x'], [''], ['Draft'], ['archived'], ['toString'], ['__proto__']])(
    'ignores status=%j',
    (status) => {
      expect(parseDashboardParams({ status }, 'editor').status).toBeNull()
    },
  )

  it.each(LIST_SORTS.map((sort) => [sort]))('reads sort=%s (LIST-3)', (sort) => {
    expect(parseDashboardParams({ sort }, 'contributor').sort).toBe(sort)
  })

  it.each([['foo'], [''], ['Title'], ['createdBy'], ['toString'], ['__proto__']])(
    'ignores sort=%j',
    (sort) => {
      expect(parseDashboardParams({ sort }, 'editor').sort).toBe('deadline')
    },
  )

  it.each([['asc'], ['desc']] as const)('reads dir=%s (LIST-3)', (dir) => {
    expect(parseDashboardParams({ dir }, 'contributor').dir).toBe(dir)
  })

  it.each([['up'], [''], ['DESC'], ['descending'], ['toString'], ['__proto__']])(
    'ignores dir=%j',
    (dir) => {
      expect(parseDashboardParams({ dir }, 'editor').dir).toBe('asc')
    },
  )

  it('reads status, sort and dir in the board view and for both roles', () => {
    for (const role of ['editor', 'contributor'] as const) {
      expect(
        parseDashboardParams({ view: 'board', status: 'idea', sort: 'type', dir: 'desc' }, role),
      ).toEqual({ ...DEFAULTS, status: 'idea', sort: 'type', dir: 'desc' })
    }
  })

  it('uses the first value of an array', () => {
    expect(
      parseDashboardParams(
        {
          view: ['list', 'board'],
          type: ['podcast', 'video'],
          author: ['7', '8'],
          archived: ['1', '0'],
          status: ['draft', 'idea'],
          sort: ['status', 'title'],
          dir: ['desc', 'asc'],
          item: ['new', '3'],
        },
        'editor',
      ),
    ).toEqual({
      view: 'list',
      type: 'podcast',
      author: 7,
      archived: true,
      status: 'draft',
      sort: 'status',
      dir: 'desc',
      item: { kind: 'new' },
    })
  })

  it('gives the default when the first value of an array is bad', () => {
    expect(
      parseDashboardParams(
        {
          view: ['x', 'list'],
          type: [],
          author: ['0', '7'],
          status: ['x', 'draft'],
          sort: ['foo', 'title'],
          dir: ['up', 'desc'],
          item: ['', '3'],
        },
        'editor',
      ),
    ).toEqual(DEFAULTS)
  })

  it('ignores unknown keys', () => {
    expect(parseDashboardParams({ foo: 'bar', items: '3' }, 'editor')).toEqual(DEFAULTS)
  })

  it.each([
    ['1', 1],
    ['42', 42],
    ['9007199254740991', 9007199254740991],
  ])('reads item=%s as an id (ITEM-1)', (item, id) => {
    expect(parseDashboardParams({ item }, 'editor').item).toEqual({ kind: 'id', id })
  })

  it('reads item=new (ITEM-1, ITEM-11)', () => {
    expect(parseDashboardParams({ item: 'new' }, 'contributor').item).toEqual({ kind: 'new' })
  })

  it.each([[''], [undefined]])('gives no dialog for item=%j (ITEM-1)', (item) => {
    expect(parseDashboardParams({ item }, 'editor').item).toBeNull()
  })

  it.each([
    ['abc'],
    ['0'],
    ['-1'],
    ['1.5'],
    ['01'],
    ['1e3'],
    [' 1'],
    ['+1'],
    ['New'],
    ['9007199254740992'],
  ])('reads item=%j as invalid (ITEM-12)', (item) => {
    expect(parseDashboardParams({ item }, 'editor').item).toEqual({ kind: 'invalid' })
  })

  it('reads item in both views and for both roles (ITEM-1)', () => {
    for (const role of ['editor', 'contributor'] as const) {
      for (const view of ['board', 'list'] as const) {
        expect(parseDashboardParams({ view, item: '5' }, role).item).toEqual({ kind: 'id', id: 5 })
      }
    }
  })

  it('reads item=invalid when the first value of an array is bad (ITEM-12)', () => {
    expect(parseDashboardParams({ item: ['x', '3'] }, 'editor').item).toEqual({
      kind: 'invalid',
    })
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

  it('writes all keys in the order view, type, author, archived, status, sort, dir, item', () => {
    expect(
      dashboardHref(DEFAULTS, {
        item: { kind: 'id', id: 1 },
        dir: 'desc',
        sort: 'authors',
        status: 'published',
        archived: true,
        author: 5,
        type: 'video',
        view: 'list',
      }),
    ).toBe(
      '/?view=list&type=video&author=5&archived=1&status=published&sort=authors&dir=desc&item=1',
    )
  })

  it('writes item as the last key (ITEM-1)', () => {
    expect(
      dashboardHref(DEFAULTS, { item: { kind: 'id', id: 12 }, dir: 'desc', view: 'list' }),
    ).toBe('/?view=list&dir=desc&item=12')
  })

  it('writes item=new (ITEM-1)', () => {
    expect(dashboardHref(DEFAULTS, { item: { kind: 'new' } })).toBe('/?item=new')
  })

  it('does not write an invalid item (ITEM-12)', () => {
    expect(dashboardHref(DEFAULTS, { item: { kind: 'invalid' }, view: 'list' })).toBe('/?view=list')
  })

  it('removes the item with item: null (ITEM-2)', () => {
    expect(dashboardHref({ ...DEFAULTS, item: { kind: 'id', id: 3 } }, { item: null })).toBe('/')
  })

  it('writes a status tab', () => {
    expect(dashboardHref(DEFAULTS, { status: 'draft' })).toBe('/?status=draft')
  })

  it('writes dir without the default sort', () => {
    expect(dashboardHref(DEFAULTS, { dir: 'desc' })).toBe('/?dir=desc')
  })

  it('writes sort without the default dir', () => {
    expect(dashboardHref(DEFAULTS, { sort: 'title', dir: 'asc' })).toBe('/?sort=title')
  })

  it('applies the change to the current params', () => {
    const current: DashboardParams = {
      ...DEFAULTS,
      view: 'list',
      type: 'article',
      author: 2,
      sort: 'title',
    }
    expect(dashboardHref(current, { type: 'podcast' })).toBe(
      '/?view=list&type=podcast&author=2&sort=title',
    )
  })

  it('drops the default values', () => {
    const current: DashboardParams = {
      view: 'list',
      type: 'article',
      author: 2,
      archived: true,
      status: 'idea',
      sort: 'creator',
      dir: 'desc',
      item: { kind: 'id', id: 3 },
    }
    expect(dashboardHref(current, DEFAULTS)).toBe('/')
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
    { ...DEFAULTS, view: 'list' },
    { ...DEFAULTS, type: 'newsletter' },
    { ...DEFAULTS, author: 9 },
    { ...DEFAULTS, archived: true },
    { ...DEFAULTS, status: 'review' },
    { ...DEFAULTS, sort: 'status' },
    { ...DEFAULTS, dir: 'desc' },
    { ...DEFAULTS, item: { kind: 'new' } },
    { ...DEFAULTS, item: { kind: 'id', id: 77 } },
    {
      view: 'list',
      type: 'video',
      author: 123,
      archived: true,
      status: 'published',
      sort: 'title',
      dir: 'desc',
      item: { kind: 'id', id: 8 },
    },
  ])('round-trips %j', (params) => {
    const href = dashboardHref(params, {})
    const query = Object.fromEntries(new URL(href, 'http://localhost').searchParams)
    expect(parseDashboardParams(query, 'editor')).toEqual(params)
  })
})

describe('nextSort', () => {
  it('flips the direction for the same column (LIST-3)', () => {
    expect(nextSort({ sort: 'title', dir: 'asc' }, 'title')).toEqual({ sort: 'title', dir: 'desc' })
    expect(nextSort({ sort: 'title', dir: 'desc' }, 'title')).toEqual({ sort: 'title', dir: 'asc' })
  })

  it('flips the direction for the default column', () => {
    expect(nextSort({ sort: 'deadline', dir: 'asc' }, 'deadline')).toEqual({
      sort: 'deadline',
      dir: 'desc',
    })
  })

  it.each(['asc', 'desc'] as const)('starts another column ascending (from dir=%s)', (dir) => {
    expect(nextSort({ sort: 'deadline', dir }, 'status')).toEqual({ sort: 'status', dir: 'asc' })
  })
})

describe('hasFilters', () => {
  it.each<[string, Partial<DashboardParams>, boolean]>([
    ['no filters', {}, false],
    ['the list view', { view: 'list' }, false],
    ['Show archived only', { archived: true }, false],
    ['a status tab and a sort', { status: 'draft', sort: 'title', dir: 'desc' }, false],
    ['a type', { type: 'video' }, true],
    ['an author', { author: 4 }, true],
    ['a type and an author', { type: 'article', author: 4 }, true],
  ])('checks %s', (_name, change, expected) => {
    expect(hasFilters({ ...DEFAULTS, ...change })).toBe(expected)
  })
})
