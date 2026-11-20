import { describe, expect, it } from 'vitest'

import type { ContentItem, User } from '@/payload-types'

import { authorIds, checkItemChange, sameIds } from './rules'

describe('authorIds', () => {
  it('reads ids and populated users', () => {
    const user: User = {
      id: 2,
      name: 'Sara Nielsen',
      email: 'sara@example.com',
      role: 'contributor',
      collection: 'users',
      createdAt: '',
      updatedAt: '',
    }

    expect(authorIds([1, user])).toEqual([1, 2])
  })

  it('gives an empty list for no authors', () => {
    expect(authorIds(null)).toEqual([])
    expect(authorIds(undefined)).toEqual([])
  })
})

describe('sameIds', () => {
  it('ignores the order', () => {
    expect(sameIds([1, 2], [2, 1])).toBe(true)
  })

  it('finds an added or a removed id', () => {
    expect(sameIds([1, 2], [1, 2, 3])).toBe(false)
    expect(sameIds([1, 2], [1])).toBe(false)
  })

  it('finds a swapped id', () => {
    expect(sameIds([1, 2], [1, 3])).toBe(false)
  })
})

const NOW = '2026-11-20T10:00:00.000Z'
const EARLIER = '2026-11-01T08:00:00.000Z'

const editor = { id: 1, role: 'editor' } as const
const contributor = { id: 2, role: 'contributor' } as const

/** A saved item. The contributor (2) is the creator and an author. */
function saved(change: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 10,
    title: 'A title',
    status: 'draft',
    type: 'article',
    authors: [2, 3],
    deadline: null,
    archived: false,
    createdBy: 2,
    publishedAt: null,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    ...change,
  }
}

/** The result of an update: Payload passes the saved item with the sent fields on top. */
function update(
  user: typeof editor | typeof contributor | null,
  originalDoc: ContentItem,
  change: Partial<ContentItem>,
) {
  return checkItemChange({ user, data: { ...originalDoc, ...change }, originalDoc, now: NOW })
}

function create(user: typeof editor | typeof contributor | null, data: Partial<ContentItem>) {
  return checkItemChange({ user, data, originalDoc: undefined, now: NOW })
}

describe('checkItemChange: create', () => {
  const input: Partial<ContentItem> = { title: 'New', status: 'idea', type: 'article' }

  it('MODEL-1, AUTH-1: the user is the creator and an author', () => {
    expect(create(contributor, { ...input, authors: [3] })).toEqual({
      ok: true,
      data: { ...input, authors: [3, 2], createdBy: 2, publishedAt: null },
    })
  })

  it('MODEL-1: a sent createdBy is replaced with the user', () => {
    expect(create(contributor, { ...input, createdBy: 1 })).toMatchObject({
      ok: true,
      data: { createdBy: 2 },
    })
  })

  it('AUTH-1: a user who is in authors is not added again', () => {
    expect(create(contributor, { ...input, authors: [2, 3] })).toMatchObject({
      ok: true,
      data: { authors: [2, 3] },
    })
  })

  it('PERM-3: a contributor cannot create a published item', () => {
    expect(create(contributor, { ...input, status: 'published' })).toEqual({
      ok: false,
      rule: 'PERM-3',
      message: 'Only editors can publish items.',
    })
  })

  it('PERM-4, MODEL-2: an editor creates a published item, publishedAt is now', () => {
    expect(create(editor, { ...input, status: 'published' })).toMatchObject({
      ok: true,
      data: { status: 'published', publishedAt: NOW },
    })
  })

  it('a system call (no user) keeps the sent creator and adds no author', () => {
    expect(create(null, { ...input, createdBy: 3, authors: [3] })).toEqual({
      ok: true,
      data: { ...input, createdBy: 3, authors: [3], publishedAt: null },
    })
  })
})

describe('checkItemChange: update', () => {
  it('MODEL-1: the creator never changes', () => {
    expect(update(editor, saved(), { createdBy: 1 })).toMatchObject({
      ok: true,
      data: { createdBy: 2 },
    })
  })

  it('MODEL-2: a change to published sets publishedAt to now', () => {
    expect(update(editor, saved({ status: 'review' }), { status: 'published' })).toMatchObject({
      ok: true,
      data: { status: 'published', publishedAt: NOW },
    })
  })

  it('MODEL-2: a published item that stays published keeps publishedAt', () => {
    const original = saved({ status: 'published', publishedAt: EARLIER })
    expect(update(editor, original, { title: 'Changed' })).toMatchObject({
      ok: true,
      data: { publishedAt: EARLIER },
    })
  })

  it('MODEL-2: publishedAt stays after unpublish, and a sent value is ignored', () => {
    const original = saved({ status: 'published', publishedAt: EARLIER })
    expect(update(editor, original, { status: 'review', publishedAt: NOW })).toMatchObject({
      ok: true,
      data: { status: 'review', publishedAt: EARLIER },
    })
  })

  it('PERM-3: a contributor cannot publish', () => {
    expect(update(contributor, saved({ status: 'review' }), { status: 'published' })).toEqual({
      ok: false,
      rule: 'PERM-3',
      message: 'Only editors can publish items.',
    })
  })

  it('PERM-4: a contributor moves an item between idea, draft and review', () => {
    expect(update(contributor, saved(), { status: 'review' })).toMatchObject({
      ok: true,
      data: { status: 'review' },
    })
  })

  it.each<[string, Partial<ContentItem>]>([
    ['unpublish', { status: 'review' }],
    ['a new title', { title: 'Changed' }],
    ['archive (PERM-5)', { archived: true }],
  ])(
    'PERM-2: a contributor cannot change a published item: %s (the second check after access)',
    (_name, change) => {
      const original = saved({ status: 'published', publishedAt: EARLIER })
      expect(update(contributor, original, change)).toEqual({
        ok: false,
        rule: 'PERM-2',
        message: 'Only editors can change a published item.',
      })
    },
  )

  it.each<[string, Partial<ContentItem>]>([
    ['title', { title: 'Changed' }],
    ['status', { status: 'review' }],
    ['type', { type: 'video' }],
    ['deadline', { deadline: '2026-11-24' }],
    ['authors', { authors: [2] }],
  ])('PERM-6: an archived item rejects a new %s, also from an editor', (_name, change) => {
    for (const user of [editor, contributor]) {
      expect(update(user, saved({ archived: true }), change)).toEqual({
        ok: false,
        rule: 'PERM-6',
        message: 'This item is archived. Unarchive it before you change it.',
      })
    }
  })

  it('PERM-6: unarchive alone is allowed, with the same authors in another order', () => {
    const original = saved({ archived: true })
    expect(update(contributor, original, { archived: false, authors: [3, 2] })).toMatchObject({
      ok: true,
      data: { archived: false },
    })
  })

  it('PERM-6: an empty deadline and no deadline are the same value', () => {
    const original = saved({ archived: true, deadline: null })
    expect(update(editor, original, { archived: false, deadline: undefined })).toMatchObject({
      ok: true,
    })
  })

  it('AUTH-2: a contributor cannot remove themselves from authors', () => {
    expect(update(contributor, saved(), { authors: [3] })).toEqual({
      ok: false,
      rule: 'AUTH-2',
      message: 'You cannot remove yourself from the authors. Ask an editor to do it.',
    })
  })

  it('AUTH-2: a contributor adds and removes other authors', () => {
    expect(update(contributor, saved(), { authors: [2, 4] })).toMatchObject({
      ok: true,
      data: { authors: [2, 4] },
    })
  })

  it('AUTH-2: a creator who is not an author can leave authors as they are', () => {
    expect(update(contributor, saved({ authors: [3] }), { title: 'Changed' })).toMatchObject({
      ok: true,
    })
  })

  it('AUTH-3: an editor removes any author, also themselves', () => {
    expect(update(editor, saved({ authors: [1, 2] }), { authors: [] })).toMatchObject({
      ok: true,
      data: { authors: [] },
    })
  })

  it('a system call (no user) skips the user rules', () => {
    expect(update(null, saved({ archived: true }), { title: 'Changed' })).toMatchObject({
      ok: true,
      data: { title: 'Changed' },
    })
  })
})
