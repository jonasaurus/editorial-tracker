import { describe, expect, it } from 'vitest'

import type { ContentItem, User } from '@/payload-types'

import {
  type Board,
  type BoardColumn,
  type BoardItem,
  buildBoard,
  compareByDeadline,
  compareByPublished,
  formatColumnCount,
  formatCounts,
  toBoardItem,
  getBoardEmpty,
} from './board'
import { boardItem as item } from './board.fixture'

const TODAY = '2026-11-19'

function user(id: number, name: string): User {
  return {
    id,
    name,
    role: 'contributor',
    email: `user${id}@example.com`,
    collection: 'users',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

function doc(change: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 1,
    title: 'A title',
    status: 'draft',
    type: 'article',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...change,
  }
}

const titles = (items: BoardItem[]) => items.map((i) => i.title)

/** The Draft column of the board. */
function draftColumn(board: Board): BoardColumn {
  const column = board.columns.find((c) => c.status === 'draft')
  if (!column) throw new Error('no Draft column')
  return column
}

describe('toBoardItem', () => {
  it('maps a populated document', () => {
    expect(
      toBoardItem(
        doc({
          id: 7,
          title: 'Winter guide',
          status: 'review',
          type: 'podcast',
          deadline: '2026-11-24',
          archived: false,
          authors: [user(2, 'Sara Nielsen'), user(3, 'Anders Berg')],
          createdBy: user(1, 'Mette Holm'),
          publishedAt: null,
        }),
      ),
    ).toEqual({
      id: 7,
      title: 'Winter guide',
      status: 'review',
      type: 'podcast',
      deadline: '2026-11-24',
      publishedAt: null,
      archived: false,
      authorNames: ['Sara Nielsen', 'Anders Berg'],
      creatorName: 'Mette Holm',
    })
  })

  it('keeps the stored author order and skips ids that are not populated', () => {
    const result = toBoardItem(
      doc({ authors: [user(3, 'Anders Berg'), 5, user(2, 'Sara Nielsen')] }),
    )
    expect(result.authorNames).toEqual(['Anders Berg', 'Sara Nielsen'])
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty list', []],
  ])('gives no authors for %s', (_name, authors) => {
    expect(toBoardItem(doc({ authors })).authorNames).toEqual([])
  })

  it.each([
    ['an id', 4],
    ['null', null],
    ['undefined', undefined],
  ])('gives no creator name for %s', (_name, createdBy) => {
    expect(toBoardItem(doc({ createdBy })).creatorName).toBeNull()
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
  ])('gives no deadline for %s', (_name, deadline) => {
    expect(toBoardItem(doc({ deadline })).deadline).toBeNull()
  })

  it.each([
    [true, true],
    [false, false],
    [null, false],
    [undefined, false],
  ])('maps archived=%s to %s', (archived, expected) => {
    expect(toBoardItem(doc({ archived })).archived).toBe(expected)
  })

  it('does not copy the emails', () => {
    const result = toBoardItem(doc({ authors: [user(2, 'Sara')], createdBy: user(1, 'Mette') }))
    expect(JSON.stringify(result)).not.toContain('@')
  })
})

describe('compareByDeadline (BOARD-2)', () => {
  const sort = (items: BoardItem[]) => titles([...items].sort(compareByDeadline))

  it('puts the earliest deadline first and no deadline last', () => {
    expect(
      sort([
        item({ title: 'none', deadline: null }),
        item({ title: 'dec', deadline: '2026-12-01' }),
        item({ title: 'last year', deadline: '2025-12-31' }),
        item({ title: 'nov', deadline: '2026-11-20' }),
        item({ title: 'next year', deadline: '2027-01-01' }),
      ]),
    ).toEqual(['last year', 'nov', 'dec', 'next year', 'none'])
  })

  it('sorts by title for the same deadline', () => {
    expect(
      sort([
        item({ title: 'beta', deadline: '2026-11-20' }),
        item({ title: 'Alpha', deadline: '2026-11-20' }),
        item({ title: 'alpha 2', deadline: '2026-11-20' }),
      ]),
    ).toEqual(['Alpha', 'alpha 2', 'beta'])
  })

  it('sorts by title when there is no deadline', () => {
    expect(sort([item({ title: 'b' }), item({ title: 'a' })])).toEqual(['a', 'b'])
  })

  it('sorts by id for the same deadline and title', () => {
    const a = item({ id: 20, title: 'Same', deadline: '2026-11-20' })
    const b = item({ id: 3, title: 'Same', deadline: '2026-11-20' })
    expect([a, b].sort(compareByDeadline).map((i) => i.id)).toEqual([3, 20])
    expect([b, a].sort(compareByDeadline).map((i) => i.id)).toEqual([3, 20])
  })

  it('gives 0 only for the same item', () => {
    const a = item({ id: 1, deadline: '2026-11-20' })
    expect(compareByDeadline(a, a)).toBe(0)
  })
})

describe('compareByPublished (BOARD-2, Published column)', () => {
  const sort = (items: BoardItem[]) => titles([...items].sort(compareByPublished))

  it('puts the newest publishedAt first and none last', () => {
    const items = [
      item({ title: 'Old', publishedAt: '2026-10-26T09:00:00.000Z' }),
      item({ title: 'None', publishedAt: null }),
      item({ title: 'New', publishedAt: '2026-11-18T08:30:00.000Z' }),
      item({ title: 'Mid', publishedAt: '2026-11-17T23:59:59.999Z' }),
    ]
    expect(sort(items)).toEqual(['New', 'Mid', 'Old', 'None'])
  })

  it('ignores the deadline', () => {
    const items = [
      item({
        title: 'Early deadline',
        deadline: '2026-01-01',
        publishedAt: '2026-11-01T00:00:00.000Z',
      }),
      item({
        title: 'Late deadline',
        deadline: '2026-12-31',
        publishedAt: '2026-11-02T00:00:00.000Z',
      }),
    ]
    expect(sort(items)).toEqual(['Late deadline', 'Early deadline'])
  })

  it('sorts equal values by title, then id', () => {
    const at = '2026-11-18T08:30:00.000Z'
    const b = item({ title: 'B', publishedAt: at })
    const a2 = item({ title: 'A', publishedAt: at })
    const a1 = item({ title: 'A', publishedAt: at, id: a2.id - 100 })
    expect([b, a2, a1].sort(compareByPublished).map((i) => i.id)).toEqual([a1.id, a2.id, b.id])
    expect(sort([item({ title: 'Y' }), item({ title: 'X' })])).toEqual(['X', 'Y'])
  })
})

describe('buildBoard', () => {
  it('sorts Published by publishedAt, the other columns by deadline (BOARD-2)', () => {
    const board = buildBoard(
      [
        item({
          title: 'P old',
          status: 'published',
          deadline: '2026-12-01',
          publishedAt: '2026-11-01T10:00:00.000Z',
        }),
        item({
          title: 'P new',
          status: 'published',
          deadline: '2026-10-01',
          publishedAt: '2026-11-18T10:00:00.000Z',
        }),
        item({
          title: 'P archived new',
          status: 'published',
          archived: true,
          publishedAt: '2026-11-19T10:00:00.000Z',
        }),
        item({
          title: 'P archived old',
          status: 'published',
          archived: true,
          publishedAt: '2026-11-02T10:00:00.000Z',
        }),
        item({
          title: 'D late',
          status: 'draft',
          deadline: '2026-12-01',
          publishedAt: '2026-11-18T10:00:00.000Z',
        }),
        item({ title: 'D early', status: 'draft', deadline: '2026-11-20', publishedAt: null }),
      ],
      TODAY,
    )
    const column = (status: string) => board.columns.find((c) => c.status === status)
    expect(titles(column('published')?.items ?? [])).toEqual([
      'P new',
      'P old',
      'P archived new',
      'P archived old',
    ])
    expect(titles(column('draft')?.items ?? [])).toEqual(['D early', 'D late'])
  })

  it('gives 4 empty columns for no items (BOARD-1)', () => {
    expect(buildBoard([], TODAY)).toEqual({
      columns: [
        { status: 'idea', items: [], count: 0, archivedCount: 0 },
        { status: 'draft', items: [], count: 0, archivedCount: 0 },
        { status: 'review', items: [], count: 0, archivedCount: 0 },
        { status: 'published', items: [], count: 0, archivedCount: 0 },
      ],
      shown: 0,
      overdue: 0,
      archived: 0,
    })
  })

  it('puts each item in the column of its status', () => {
    const board = buildBoard(
      [
        item({ title: 'p', status: 'published' }),
        item({ title: 'i', status: 'idea' }),
        item({ title: 'r', status: 'review' }),
        item({ title: 'd', status: 'draft' }),
      ],
      TODAY,
    )
    expect(board.columns.map((c) => [c.status, titles(c.items)])).toEqual([
      ['idea', ['i']],
      ['draft', ['d']],
      ['review', ['r']],
      ['published', ['p']],
    ])
  })

  it('sorts active items by deadline, then archived items by deadline', () => {
    const board = buildBoard(
      [
        item({ title: 'archived late', deadline: '2026-12-10', archived: true }),
        item({ title: 'active none' }),
        item({ title: 'archived early', deadline: '2026-11-01', archived: true }),
        item({ title: 'active late', deadline: '2026-12-01' }),
        item({ title: 'archived none', archived: true }),
        item({ title: 'active early', deadline: '2026-11-25' }),
      ],
      TODAY,
    )
    const draft = draftColumn(board)
    expect(titles(draft.items)).toEqual([
      'active early',
      'active late',
      'active none',
      'archived early',
      'archived late',
      'archived none',
    ])
    expect(draft.count).toBe(3)
    expect(draft.archivedCount).toBe(3)
  })

  it('gives a stable order for any input order', () => {
    const items = [
      item({ title: 'b', deadline: '2026-11-20' }),
      item({ title: 'a', deadline: '2026-11-20' }),
      item({ title: 'a', deadline: '2026-11-20' }),
      item({ title: 'c' }),
      item({ title: 'a', archived: true }),
    ]
    const ids = (input: BoardItem[]) => draftColumn(buildBoard(input, TODAY)).items.map((i) => i.id)
    expect(ids([...items].reverse())).toEqual(ids(items))
  })

  it('does not change the input', () => {
    const items = [item({ title: 'b', deadline: '2026-12-01' }), item({ title: 'a' })]
    const copy = structuredClone(items)
    buildBoard(items, TODAY)
    expect(items).toEqual(copy)
  })

  it('counts active, overdue and archived items (DASH-4, DL-5)', () => {
    const board = buildBoard(
      [
        item({ status: 'idea', deadline: '2026-11-18' }),
        item({ status: 'draft', deadline: '2026-01-01' }),
        item({ status: 'review', deadline: TODAY }),
        item({ status: 'review', deadline: '2026-11-20' }),
        item({ status: 'draft' }),
        item({ status: 'published', deadline: '2026-11-01' }),
        item({ status: 'draft', deadline: '2026-11-01', archived: true }),
        item({ status: 'published', deadline: '2026-11-01', archived: true }),
      ],
      TODAY,
    )
    expect(board.shown).toBe(6)
    expect(board.overdue).toBe(2)
    expect(board.archived).toBe(2)
    expect(board.columns.map((c) => [c.count, c.archivedCount])).toEqual([
      [1, 0],
      [2, 1],
      [2, 0],
      [1, 1],
    ])
  })
})

describe('formatCounts (DASH-4)', () => {
  const base = { shown: 14, total: 14, overdue: 0, archived: 0, showArchived: false }

  it.each([
    [{ shown: 14, total: 14 }, '14 items'],
    [{ shown: 1, total: 1 }, '1 item'],
    [{ shown: 0, total: 0 }, '0 items'],
    [{ shown: 0, total: 14 }, '0 of 14 items'],
    [{ shown: 3, total: 14 }, '3 of 14 items'],
    [{ shown: 1, total: 14 }, '1 of 14 items'],
    [{ shown: 0, total: 1 }, '0 of 1 item'],
  ])('writes %j as "%s"', (change, expected) => {
    expect(formatCounts({ ...base, ...change }).items).toBe(expected)
  })

  it.each([
    [0, null],
    [1, '1 overdue'],
    [2, '2 overdue'],
  ])('writes %i overdue as %j', (overdue, expected) => {
    expect(formatCounts({ ...base, overdue }).overdue).toBe(expected)
  })

  it.each([
    [1, true, '1 archived'],
    [3, true, '3 archived'],
    [0, true, null],
    [3, false, null],
    [0, false, null],
  ])('writes %i archived with Show archived %s as %j', (archived, showArchived, expected) => {
    expect(formatCounts({ ...base, archived, showArchived }).archived).toBe(expected)
  })
})

describe('formatColumnCount', () => {
  it.each([
    [3, 0, '3', null],
    [0, 0, '0', null],
    [3, 1, '3', '1 archived'],
    [0, 2, '0', '2 archived'],
  ])('writes %i and %i archived as "%s" and %s', (count, archivedCount, text, archived) => {
    expect(formatColumnCount(count, archivedCount)).toEqual({ count: text, archived })
  })
})

describe('getBoardEmpty', () => {
  it('EMPTY-1: no item at all gives no-items, also with filters', () => {
    expect(getBoardEmpty({ hasAnyItem: false, filtered: false, itemCount: 0 })).toBe('no-items')
    expect(getBoardEmpty({ hasAnyItem: false, filtered: true, itemCount: 0 })).toBe('no-items')
  })

  it('EMPTY-3: filters that hide all items give no-results', () => {
    expect(getBoardEmpty({ hasAnyItem: true, filtered: true, itemCount: 0 })).toBe('no-results')
  })

  it('EMPTY-2: in all other cases the columns show their own empty text', () => {
    expect(getBoardEmpty({ hasAnyItem: true, filtered: true, itemCount: 2 })).toBe('none')
    // Only archived items exist, and Show archived is off.
    expect(getBoardEmpty({ hasAnyItem: true, filtered: false, itemCount: 0 })).toBe('none')
  })
})
