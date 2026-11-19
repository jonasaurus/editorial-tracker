import { describe, expect, it } from 'vitest'

import { STATUSES } from '@/lib/items'

import type { BoardItem } from './board'
import { buildList, compareForList, getListEmpty } from './list'
import type { ListSort, SortDir } from './params'

let nextId = 1
function item(change: Partial<BoardItem> = {}): BoardItem {
  return {
    id: nextId++,
    title: 'A title',
    type: 'article',
    status: 'draft',
    deadline: null,
    archived: false,
    authorNames: [],
    creatorName: null,
    ...change,
  }
}

const titles = (items: BoardItem[]) => items.map((i) => i.title)

function sorted(items: BoardItem[], sort: ListSort, dir: SortDir): string[] {
  return titles([...items].sort(compareForList(sort, dir)))
}

describe('compareForList (LIST-3)', () => {
  it.each<[ListSort, BoardItem[], string[]]>([
    [
      'title',
      [item({ title: 'banana' }), item({ title: 'Apple' }), item({ title: 'cherry' })],
      ['Apple', 'banana', 'cherry'],
    ],
    [
      'type',
      [
        item({ title: 'v', type: 'video' }),
        item({ title: 'a', type: 'article' }),
        item({ title: 'n', type: 'newsletter' }),
        item({ title: 'p', type: 'podcast' }),
      ],
      // By label: Article, Newsletter, Podcast, Video.
      ['a', 'n', 'p', 'v'],
    ],
    [
      'status',
      [
        item({ title: 'p', status: 'published' }),
        item({ title: 'd', status: 'draft' }),
        item({ title: 'r', status: 'review' }),
        item({ title: 'i', status: 'idea' }),
      ],
      // Workflow order, not alphabetical.
      ['i', 'd', 'r', 'p'],
    ],
    [
      'authors',
      [
        item({ title: 'b', authorNames: ['Bea'] }),
        item({ title: 'ac', authorNames: ['Ann', 'Cid'] }),
        item({ title: 'ab', authorNames: ['Ann', 'Bea'] }),
      ],
      ['ab', 'ac', 'b'],
    ],
    [
      'creator',
      [
        item({ title: 'z', creatorName: 'zoe' }),
        item({ title: 'a', creatorName: 'Ann' }),
        item({ title: 'm', creatorName: 'Mo' }),
      ],
      ['a', 'm', 'z'],
    ],
    [
      'deadline',
      [
        item({ title: 'c', deadline: '2026-12-01' }),
        item({ title: 'a', deadline: '2026-01-31' }),
        item({ title: 'b', deadline: '2026-02-01' }),
      ],
      ['a', 'b', 'c'],
    ],
  ])('sorts by %s in both directions', (sort, items, ascending) => {
    expect(sorted(items, sort, 'asc')).toEqual(ascending)
    expect(sorted(items, sort, 'desc')).toEqual([...ascending].reverse())
  })

  it.each<[ListSort, Partial<BoardItem>, Partial<BoardItem>, Partial<BoardItem>]>([
    ['deadline', { deadline: '2026-01-01' }, { deadline: '2026-06-01' }, { deadline: null }],
    ['authors', { authorNames: ['Ann'] }, { authorNames: ['Bea'] }, { authorNames: [] }],
    ['creator', { creatorName: 'Ann' }, { creatorName: 'Bea' }, { creatorName: null }],
  ])('puts empty %s values last in both directions', (sort, low, high, empty) => {
    const items = [
      item({ title: 'empty', ...empty }),
      item({ title: 'high', ...high }),
      item({ title: 'low', ...low }),
    ]
    expect(sorted(items, sort, 'asc')).toEqual(['low', 'high', 'empty'])
    expect(sorted(items, sort, 'desc')).toEqual(['high', 'low', 'empty'])
  })

  it('orders ties by deadline ascending, no deadline last, in both directions', () => {
    const items = [
      item({ title: 'none', status: 'idea' }),
      item({ title: 'late', status: 'idea', deadline: '2026-12-01' }),
      item({ title: 'early', status: 'idea', deadline: '2026-01-01' }),
      item({ title: 'other', status: 'review' }),
    ]
    expect(sorted(items, 'status', 'asc')).toEqual(['early', 'late', 'none', 'other'])
    expect(sorted(items, 'status', 'desc')).toEqual(['other', 'early', 'late', 'none'])
  })

  it('orders ties by title, then id, in both directions', () => {
    const first = item({ title: 'Same', type: 'video' })
    const second = item({ title: 'Same', type: 'video' })
    const alpha = item({ title: 'Alpha', type: 'video' })
    for (const dir of ['asc', 'desc'] as const) {
      const ids = [second, first, alpha].sort(compareForList('type', dir)).map((i) => i.id)
      expect(ids).toEqual([alpha.id, first.id, second.id])
    }
  })

  it('orders empty values among themselves by the tie rule', () => {
    const items = [
      item({ title: 'b', deadline: '2026-05-01' }),
      item({ title: 'a' }),
      item({ title: 'c', deadline: '2026-03-01' }),
    ]
    expect(sorted(items, 'creator', 'asc')).toEqual(['c', 'b', 'a'])
    expect(sorted(items, 'creator', 'desc')).toEqual(['c', 'b', 'a'])
  })
})

describe('buildList', () => {
  const items = [
    item({ title: 'idea', status: 'idea' }),
    item({ title: 'draft b', status: 'draft', deadline: '2026-12-01' }),
    item({ title: 'draft a', status: 'draft', deadline: '2026-11-01' }),
    item({ title: 'draft archived', status: 'draft', deadline: '2026-01-01', archived: true }),
    item({ title: 'review archived', status: 'review', archived: true }),
  ]
  const params = { status: null, sort: 'deadline', dir: 'asc' } as const

  it('gives the All tab, then one tab per status (LIST-1)', () => {
    expect(buildList(items, params).tabs.map((tab) => tab.status)).toEqual([null, ...STATUSES])
  })

  it('counts active and archived items per tab (LIST-1)', () => {
    expect(buildList(items, params).tabs).toEqual([
      { status: null, count: 3, archivedCount: 2 },
      { status: 'idea', count: 1, archivedCount: 0 },
      { status: 'draft', count: 2, archivedCount: 1 },
      { status: 'review', count: 0, archivedCount: 1 },
      { status: 'published', count: 0, archivedCount: 0 },
    ])
  })

  it('gives the same tabs for each selected tab and sort', () => {
    const tabs = buildList(items, params).tabs
    expect(buildList(items, { status: 'review', sort: 'title', dir: 'desc' }).tabs).toEqual(tabs)
  })

  it('gives all rows in the All tab, archived last (LIST-4)', () => {
    expect(titles(buildList(items, params).rows)).toEqual([
      'draft a',
      'draft b',
      'idea',
      'draft archived',
      'review archived',
    ])
  })

  it('gives only the rows of the selected status tab', () => {
    expect(titles(buildList(items, { ...params, status: 'draft' }).rows)).toEqual([
      'draft a',
      'draft b',
      'draft archived',
    ])
  })

  it('keeps archived rows last in both directions', () => {
    expect(titles(buildList(items, { status: 'draft', sort: 'title', dir: 'desc' }).rows)).toEqual([
      'draft b',
      'draft a',
      'draft archived',
    ])
  })

  it('gives no rows for an empty tab', () => {
    expect(buildList(items, { ...params, status: 'published' }).rows).toEqual([])
  })

  it('gives zero counts and no rows for no items', () => {
    const list = buildList([], params)
    expect(list.rows).toEqual([])
    expect(list.tabs.every((tab) => tab.count === 0 && tab.archivedCount === 0)).toBe(true)
  })

  it('does not change the input', () => {
    const copy = [...items]
    buildList(items, { status: null, sort: 'title', dir: 'desc' })
    expect(items).toEqual(copy)
  })
})

describe('getListEmpty', () => {
  const base = { hasAnyItem: true, filtered: false, itemCount: 4, rowCount: 2, status: null }

  it('gives none when the tab has rows', () => {
    expect(getListEmpty(base)).toEqual({ kind: 'none' })
  })

  it('gives no-items when the user can read no item (EMPTY-1)', () => {
    expect(getListEmpty({ ...base, hasAnyItem: false, itemCount: 0, rowCount: 0 })).toEqual({
      kind: 'no-items',
    })
  })

  it('gives no-items before no-results', () => {
    expect(
      getListEmpty({ ...base, hasAnyItem: false, filtered: true, itemCount: 0, rowCount: 0 }),
    ).toEqual({ kind: 'no-items' })
  })

  it('gives no-results when filters hide all items (EMPTY-3)', () => {
    expect(
      getListEmpty({ ...base, filtered: true, itemCount: 0, rowCount: 0, status: 'draft' }),
    ).toEqual({ kind: 'no-results' })
  })

  it('gives empty-tab when filters leave items in other tabs (EMPTY-2)', () => {
    expect(
      getListEmpty({ ...base, filtered: true, itemCount: 3, rowCount: 0, status: 'review' }),
    ).toEqual({ kind: 'empty-tab', status: 'review' })
  })

  it('gives empty-tab for an empty status tab without filters (EMPTY-2)', () => {
    expect(getListEmpty({ ...base, rowCount: 0, status: 'idea' })).toEqual({
      kind: 'empty-tab',
      status: 'idea',
    })
  })

  it('gives empty-tab for the All tab with only archived items hidden', () => {
    expect(getListEmpty({ ...base, itemCount: 0, rowCount: 0 })).toEqual({
      kind: 'empty-tab',
      status: null,
    })
  })
})
