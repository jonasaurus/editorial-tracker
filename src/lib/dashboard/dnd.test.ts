import { describe, expect, it } from 'vitest'

import { STATUSES, type ItemStatus, type Role } from '@/lib/items'

import { type BoardItem, buildBoard } from './board'
import { boardItem as item } from './board.fixture'
import {
  MOVE_INSTRUCTIONS,
  announceMove,
  applyMove,
  canDropOn,
  canMoveItem,
  getDropIndex,
  getDropSlot,
  getMoveError,
  isItemDragData,
} from './dnd'

const TODAY = '2026-11-19'
const AT = '2026-11-19T21:00:00.000Z'

describe('canMoveItem (DND-1, PERM-2, PERM-6)', () => {
  const cases: [Role, ItemStatus, boolean, boolean][] = []
  for (const status of STATUSES) {
    cases.push(['editor', status, false, true])
    cases.push(['editor', status, true, false])
    cases.push(['contributor', status, false, status !== 'published'])
    cases.push(['contributor', status, true, false])
  }

  it.each(cases)('%s, %s, archived %s → %s', (role, status, archived, expected) => {
    expect(canMoveItem(role, { status, archived })).toBe(expected)
  })
})

describe('canDropOn (DND-2, PERM-3)', () => {
  const cases: [Role, ItemStatus, ItemStatus, boolean][] = []
  for (const role of ['editor', 'contributor'] as const) {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        const locked = role === 'contributor' && to === 'published'
        cases.push([role, from, to, from !== to && !locked])
      }
    }
  }

  it.each(cases)('%s: %s → %s gives %s', (role, from, to, expected) => {
    expect(canDropOn(role, { status: from }, to)).toBe(expected)
  })
})

describe('applyMove', () => {
  it('gives the moved item the new status in a new object', () => {
    const a = item({ status: 'draft' })
    const b = item({ status: 'idea' })
    const items = [a, b]

    const result = applyMove(items, { id: a.id, status: 'review', at: AT })

    expect(result).not.toBe(items)
    expect(result[0]).toEqual({ ...a, status: 'review', publishedAt: null })
    expect(result[0]).not.toBe(a)
    expect(result[1]).toBe(b)
  })

  it('does not change the input', () => {
    const a = item({ status: 'draft' })
    const items = [a]

    applyMove(items, { id: a.id, status: 'published', at: AT })

    expect(items).toEqual([a])
    expect(a.status).toBe('draft')
  })

  it('gives an equal list for an unknown id', () => {
    const items = [item(), item()]

    expect(applyMove(items, { id: -1, status: 'review', at: AT })).toEqual(items)
  })

  it('puts the item in the new column of the board', () => {
    const a = item({ status: 'draft', title: 'Moved' })
    const b = item({ status: 'draft', title: 'Stays' })

    const board = buildBoard(applyMove([a, b], { id: a.id, status: 'review', at: AT }), TODAY)
    const column = (status: ItemStatus) => board.columns.find((c) => c.status === status)

    expect(column('draft')?.items.map((i) => i.title)).toEqual(['Stays'])
    expect(column('review')?.items.map((i) => i.title)).toEqual(['Moved'])
    expect(column('draft')?.count).toBe(1)
    expect(column('review')?.count).toBe(1)
  })
})

describe('applyMove: publishedAt (MODEL-2)', () => {
  it('sets publishedAt to the drop time on a move to Published', () => {
    const a = item({ status: 'review', publishedAt: '2026-01-01T00:00:00.000Z' })
    expect(applyMove([a], { id: a.id, status: 'published', at: AT })[0]?.publishedAt).toBe(AT)
  })

  it('keeps publishedAt on a move to another status', () => {
    const old = '2026-01-01T00:00:00.000Z'
    const a = item({ status: 'published', publishedAt: old })
    expect(applyMove([a], { id: a.id, status: 'review', at: AT })[0]?.publishedAt).toBe(old)
  })

  it('puts the item first in Published (BOARD-2)', () => {
    const a = item({ status: 'review', title: 'Moved' })
    const b = item({ status: 'published', title: 'Older', publishedAt: '2026-11-18T10:00:00.000Z' })
    const board = buildBoard(applyMove([a, b], { id: a.id, status: 'published', at: AT }), TODAY)
    const published = board.columns.find((c) => c.status === 'published')
    expect(published?.items.map((i) => i.title)).toEqual(['Moved', 'Older'])
  })
})

describe('getDropIndex (BOARD-2, design-system "Drop targets")', () => {
  const column = (status: ItemStatus, items: BoardItem[]) => {
    const built = buildBoard(items, TODAY).columns.find((c) => c.status === status)
    if (!built) throw new Error('no column')
    return built
  }
  const review = column('review', [
    item({ status: 'review', title: 'B', deadline: '2026-11-20' }),
    item({ status: 'review', title: 'D', deadline: '2026-11-25' }),
    item({ status: 'review', title: 'F', deadline: null }),
    item({ status: 'review', title: 'Archived', deadline: '2026-11-01', archived: true }),
  ])
  const dragged = (change: Partial<BoardItem>) => item({ status: 'draft', ...change })

  it('gives the sorted place among the active items', () => {
    expect(getDropIndex(review, dragged({ deadline: '2026-11-19' }))).toBe(0)
    expect(getDropIndex(review, dragged({ deadline: '2026-11-22' }))).toBe(1)
    expect(getDropIndex(review, dragged({ deadline: '2026-11-30' }))).toBe(2)
  })

  it('puts an item with no deadline after the active items, before the archived ones', () => {
    expect(getDropIndex(review, dragged({ title: 'Z', deadline: null }))).toBe(3)
    expect(getDropIndex(review, dragged({ title: 'A', deadline: null }))).toBe(2)
  })

  it('breaks ties by title', () => {
    expect(getDropIndex(review, dragged({ title: 'C', deadline: '2026-11-20' }))).toBe(1)
    expect(getDropIndex(review, dragged({ title: 'A', deadline: '2026-11-20' }))).toBe(0)
  })

  it('gives 0 for an empty column and a column with only archived items', () => {
    expect(getDropIndex(column('idea', []), dragged({ deadline: '2026-11-22' }))).toBe(0)
    const archivedOnly = column('idea', [
      item({ status: 'idea', archived: true, deadline: '2026-01-01' }),
    ])
    expect(getDropIndex(archivedOnly, dragged({ deadline: '2026-12-01' }))).toBe(0)
  })

  it('gives 0 in Published: the new publishedAt is the newest', () => {
    const published = column('published', [
      item({ status: 'published', publishedAt: '2026-11-18T10:00:00.000Z' }),
      item({ status: 'published', publishedAt: null }),
    ])
    expect(getDropIndex(published, dragged({ deadline: null }))).toBe(0)
  })
})

describe('getMoveError (DND-4, ERR-2)', () => {
  it('gives the ERR-2 example text when the server does not respond', () => {
    expect(getMoveError({ reason: 'no-response' }, 'review')).toEqual({
      title: 'Item not moved',
      text: 'The server did not respond. The item went back to Review. Try again.',
    })
  })

  it('adds the old column to a rejected message', () => {
    expect(
      getMoveError({ reason: 'rejected', message: 'Only editors can publish items.' }, 'draft'),
    ).toEqual({
      title: 'Item not moved',
      text: 'Only editors can publish items. The item went back to Draft.',
    })
  })

  it('adds a period to a rejected message without one', () => {
    expect(
      getMoveError({ reason: 'rejected', message: 'This item changed on the server' }, 'idea').text,
    ).toBe('This item changed on the server. The item went back to Idea.')
  })

  it('gives a text for an invalid move', () => {
    expect(getMoveError({ reason: 'invalid' }, 'published')).toEqual({
      title: 'Item not moved',
      text: 'The move is not valid. The item went back to Published.',
    })
  })
})

describe('MOVE_INSTRUCTIONS (DND-5)', () => {
  it('tells the keys and uses the word "item"', () => {
    expect(MOVE_INSTRUCTIONS).toBe(
      'Press Enter to open the item. To move it, press Space. Use the Left and Right arrow keys to choose a column. Press Space again to drop it, or press Escape to cancel.',
    )
    expect(MOVE_INSTRUCTIONS).not.toMatch(/card|draggable/i)
  })
})

describe('announceMove (DND-5)', () => {
  it('announces the start', () => {
    expect(announceMove('start', 'Spring issue', 'draft', null)).toBe(
      'Picked up item "Spring issue" in Draft.',
    )
  })

  it('announces the column under the item', () => {
    expect(announceMove('over', 'Spring issue', 'draft', 'published')).toBe(
      'Item "Spring issue" is over Published.',
    )
  })

  it('announces when the item is not over a column', () => {
    expect(announceMove('over', 'Spring issue', 'draft', null)).toBe(
      'Item "Spring issue" is not over a column.',
    )
  })

  it('announces a drop in another column', () => {
    expect(announceMove('end', 'Spring issue', 'draft', 'review')).toBe(
      'Item "Spring issue" dropped in Review.',
    )
  })

  it('announces that the item stays when dropped on its own column', () => {
    expect(announceMove('end', 'Spring issue', 'draft', 'draft')).toBe(
      'Item "Spring issue" stays in Draft.',
    )
  })

  it('announces that the item stays when dropped outside a column', () => {
    expect(announceMove('end', 'Spring issue', 'idea', null)).toBe(
      'Item "Spring issue" stays in Idea.',
    )
  })

  it('announces a cancel', () => {
    expect(announceMove('cancel', 'Spring issue', 'review', 'published')).toBe(
      'The move is cancelled. Item "Spring issue" stays in Review.',
    )
  })
})

describe('getDropSlot (DND-2, DND-3)', () => {
  it.each([
    ['no drag', 'editor', null, 'draft', true, null],
    ['the column of the item', 'editor', 'draft', 'draft', true, null],
    [
      'a contributor, Published, not over it',
      'contributor',
      'review',
      'published',
      false,
      'locked',
    ],
    ['a contributor, over Published', 'contributor', 'review', 'published', true, 'locked'],
    ['an editor, not over the column', 'editor', 'review', 'published', false, null],
    ['an editor, over Published', 'editor', 'review', 'published', true, 'publish'],
    ['an editor, over another column', 'editor', 'published', 'review', true, 'move'],
    ['a contributor, over another column', 'contributor', 'idea', 'draft', true, 'move'],
  ] as const)('%s', (_name, role, from, status, isDropTarget, expected) => {
    const drag = from === null ? null : { status: from }
    expect(getDropSlot(role, drag, status, isDropTarget)).toBe(expected)
  })
})

describe('isItemDragData', () => {
  const data = { title: 'A title', status: 'draft', deadline: null }

  it('accepts the data of an item card, with and without a deadline', () => {
    expect(isItemDragData(data)).toBe(true)
    expect(isItemDragData({ ...data, deadline: '2026-11-24' })).toBe(true)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'draft'],
    ['no title', { status: 'draft', deadline: null }],
    ['a title that is not a string', { ...data, title: 1 }],
    ['an unknown status', { ...data, status: 'done' }],
    ['no deadline key', { title: 'A title', status: 'draft' }],
    ['a deadline that is not a string', { ...data, deadline: 20261124 }],
  ])('rejects %s', (_name, value) => {
    expect(isItemDragData(value)).toBe(false)
  })
})
