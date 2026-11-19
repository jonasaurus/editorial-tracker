import { describe, expect, it } from 'vitest'

import { STATUSES, type ItemStatus, type Role } from '@/lib/items'

import { type BoardItem, buildBoard } from './board'
import {
  MOVE_INSTRUCTIONS,
  announceMove,
  applyMove,
  canDropOn,
  canMoveItem,
  getMoveError,
} from './dnd'

const TODAY = '2026-11-19'

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

    const result = applyMove(items, { id: a.id, status: 'review' })

    expect(result).not.toBe(items)
    expect(result[0]).toEqual({ ...a, status: 'review' })
    expect(result[0]).not.toBe(a)
    expect(result[1]).toBe(b)
  })

  it('does not change the input', () => {
    const a = item({ status: 'draft' })
    const items = [a]

    applyMove(items, { id: a.id, status: 'published' })

    expect(items).toEqual([a])
    expect(a.status).toBe('draft')
  })

  it('gives an equal list for an unknown id', () => {
    const items = [item(), item()]

    expect(applyMove(items, { id: -1, status: 'review' })).toEqual(items)
  })

  it('puts the item in the new column of the board', () => {
    const a = item({ status: 'draft', title: 'Moved' })
    const b = item({ status: 'draft', title: 'Stays' })

    const board = buildBoard(applyMove([a, b], { id: a.id, status: 'review' }), TODAY)
    const column = (status: ItemStatus) => board.columns.find((c) => c.status === status)

    expect(column('draft')?.items.map((i) => i.title)).toEqual(['Stays'])
    expect(column('review')?.items.map((i) => i.title)).toEqual(['Moved'])
    expect(column('draft')?.count).toBe(1)
    expect(column('review')?.count).toBe(1)
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
