import { describe, expect, it } from 'vitest'

import type { ItemStatus, Role } from '@/lib/items'

import {
  getKicker,
  initialValues,
  isArmed,
  isDirty,
  type ItemFormValues,
  toItemInput,
  validateValues,
} from './form'
import type { ItemDetail } from './types'

const ITEM: ItemDetail = {
  id: 7,
  title: 'Budget talks',
  status: 'review',
  type: 'article',
  deadline: '2026-11-24',
  archived: false,
  authors: [
    { id: 3, name: 'Sara Nielsen' },
    { id: 1, name: 'Jonas Berg' },
  ],
  creatorName: 'Jonas Berg',
  createdAt: '2026-11-03T09:00:00.000Z',
  updatedAt: '2026-11-19T08:12:00.000Z',
  publishedAt: null,
}

const VALUES: ItemFormValues = {
  title: 'Budget talks',
  status: 'review',
  type: 'article',
  deadline: '2026-11-24',
  authorIds: [3, 1],
}

describe('initialValues', () => {
  it('gives the defaults for a new item, with the user as author (ITEM-11, AUTH-1)', () => {
    expect(initialValues(null, 4)).toEqual({
      title: '',
      status: 'idea',
      type: 'article',
      deadline: null,
      authorIds: [4],
    })
  })

  it('gives the saved values, with the authors in the stored order (ITEM-3)', () => {
    expect(initialValues(ITEM, 4)).toEqual(VALUES)
  })

  it('gives a null deadline when the item has none', () => {
    expect(initialValues({ ...ITEM, deadline: null }, 4).deadline).toBeNull()
  })
})

describe('isDirty', () => {
  it('is false for the same values', () => {
    expect(isDirty(VALUES, { ...VALUES, authorIds: [3, 1] })).toBe(false)
  })

  it('compares the title trimmed (ITEM-10)', () => {
    expect(isDirty(VALUES, { ...VALUES, title: '  Budget talks ' })).toBe(false)
    expect(isDirty(VALUES, { ...VALUES, title: 'Budget talk' })).toBe(true)
  })

  it.each<[string, Partial<ItemFormValues>]>([
    ['the status', { status: 'published' }],
    ['the type', { type: 'video' }],
    ['the deadline', { deadline: '2026-11-25' }],
    ['a removed deadline', { deadline: null }],
    ['an added author', { authorIds: [3, 1, 5] }],
    ['a removed author', { authorIds: [3] }],
    ['the author order', { authorIds: [1, 3] }],
  ])('is true for a change of %s (ITEM-10)', (_name, change) => {
    expect(isDirty(VALUES, { ...VALUES, ...change })).toBe(true)
  })

  it('is false for a new item with no edits', () => {
    expect(isDirty(initialValues(null, 4), initialValues(null, 4))).toBe(false)
  })

  it('is false for a new item with only spaces in the title', () => {
    const initial = initialValues(null, 4)
    expect(isDirty(initial, { ...initial, title: '   ' })).toBe(false)
  })
})

describe('validateValues', () => {
  it('gives no errors for valid values', () => {
    expect(validateValues(VALUES)).toEqual({})
  })

  it.each([[''], ['   '], ['\t\n']])('asks for a title for %j (ITEM-3)', (title) => {
    expect(validateValues({ ...VALUES, title })).toEqual({ title: 'Enter a title.' })
  })
})

describe('toItemInput', () => {
  it('trims the title and sends the authors in order', () => {
    expect(toItemInput({ ...VALUES, title: '  Budget talks  ' })).toEqual({
      title: 'Budget talks',
      status: 'review',
      type: 'article',
      deadline: '2026-11-24',
      authors: [3, 1],
    })
  })

  it('sends a null deadline', () => {
    expect(toItemInput({ ...VALUES, deadline: null }).deadline).toBeNull()
  })
})

describe('isArmed', () => {
  const base = {
    isNew: false,
    savedStatus: 'review',
    selected: 'published',
    role: 'editor',
  } as const

  it('is true for an editor who selects published on an unpublished item (ITEM-5)', () => {
    expect(isArmed(base)).toBe(true)
  })

  it.each<
    [string, { isNew: boolean; savedStatus: ItemStatus | null; selected: ItemStatus; role: Role }]
  >([
    ['a contributor', { ...base, role: 'contributor' }],
    ['a new item (ITEM-11)', { ...base, isNew: true, savedStatus: null }],
    ['a published item', { ...base, savedStatus: 'published' }],
    ['another status', { ...base, selected: 'review' }],
    ['draft', { ...base, selected: 'draft' }],
  ])('is false for %s (ITEM-5)', (_name, input) => {
    expect(isArmed(input)).toBe(false)
  })
})

describe('getKicker', () => {
  it('gives "New item" for a new item', () => {
    expect(getKicker(null, 'idea')).toEqual([{ text: 'New item', strong: false }])
    expect(getKicker(null, 'draft')).toEqual([{ text: 'New item', strong: false }])
  })

  it('gives the type and the saved status', () => {
    expect(getKicker(ITEM, 'review')).toEqual([
      { text: 'Article', strong: false },
      { text: ' · ', strong: false },
      { text: 'Review', strong: true },
    ])
  })

  it('gives "Article · Published" for a published item', () => {
    expect(getKicker({ ...ITEM, status: 'published' }, 'published')).toEqual([
      { text: 'Article', strong: false },
      { text: ' · ', strong: false },
      { text: 'Published', strong: true },
    ])
  })

  it('shows a changed status with an arrow', () => {
    expect(getKicker(ITEM, 'published')).toEqual([
      { text: 'Article', strong: false },
      { text: ' · ', strong: false },
      { text: 'Review', strong: true },
      { text: ' → ', strong: false },
      { text: 'Published', strong: true },
    ])
  })

  it('adds "Archived" for an archived item, with only "Archived" strong', () => {
    expect(getKicker({ ...ITEM, archived: true }, 'review')).toEqual([
      { text: 'Article', strong: false },
      { text: ' · ', strong: false },
      { text: 'Review', strong: false },
      { text: ' · ', strong: false },
      { text: 'Archived', strong: true },
    ])
  })

  it('uses the type label', () => {
    expect(getKicker({ ...ITEM, type: 'newsletter' }, 'review')[0]).toEqual({
      text: 'Newsletter',
      strong: false,
    })
  })
})
