import { describe, expect, it } from 'vitest'

import type { ItemStatus } from '@/lib/items'

import { getItemAbilities, getItemMode, getLockedStatuses } from './abilities'
import type { ItemDetail } from './types'

const EDITOR = { id: 1, role: 'editor' } as const
const CONTRIBUTOR = { id: 2, role: 'contributor' } as const

const ITEM: ItemDetail = {
  id: 7,
  title: 'Budget talks',
  status: 'draft',
  type: 'article',
  deadline: null,
  archived: false,
  authors: [
    { id: 2, name: 'Sara Nielsen' },
    { id: 3, name: 'Mette Holm' },
  ],
  creatorName: 'Sara Nielsen',
  createdAt: '2026-11-03T09:00:00.000Z',
  updatedAt: '2026-11-19T08:12:00.000Z',
  publishedAt: null,
}

const item = (change: Partial<ItemDetail>): ItemDetail => ({ ...ITEM, ...change })

const UNPUBLISHED: ItemStatus[] = ['idea', 'draft', 'review']

describe('getItemAbilities: new item', () => {
  it('locks Published for a contributor and the own author chip (PERM-3, ITEM-4, AUTH-1)', () => {
    expect(getItemAbilities(CONTRIBUTOR, null)).toEqual({
      mode: 'edit',
      lockedStatuses: ['published'],
      canArchive: false,
      canUnarchive: false,
      lockedAuthorIds: [2],
    })
  })

  it('locks no status for an editor, and the own author chip (AUTH-1)', () => {
    expect(getItemAbilities(EDITOR, null)).toEqual({
      mode: 'edit',
      lockedStatuses: [],
      canArchive: false,
      canUnarchive: false,
      lockedAuthorIds: [1],
    })
  })
})

describe('getItemAbilities: archived item', () => {
  it.each([...UNPUBLISHED, 'published'] as const)(
    'lets an editor unarchive a %s item (PERM-5, PERM-6, ITEM-8)',
    (status) => {
      expect(getItemAbilities(EDITOR, item({ archived: true, status }))).toEqual({
        mode: 'archived',
        lockedStatuses: [],
        canArchive: false,
        canUnarchive: true,
        lockedAuthorIds: [],
      })
    },
  )

  it.each(UNPUBLISHED)('lets a contributor unarchive an own %s item (PERM-5)', (status) => {
    expect(getItemAbilities(CONTRIBUTOR, item({ archived: true, status }))).toEqual({
      mode: 'archived',
      lockedStatuses: ['published'],
      canArchive: false,
      canUnarchive: true,
      lockedAuthorIds: [],
    })
  })

  it('does not let a contributor unarchive a published item (PERM-5, ITEM-8)', () => {
    expect(getItemAbilities(CONTRIBUTOR, item({ archived: true, status: 'published' }))).toEqual({
      mode: 'archived',
      lockedStatuses: ['published'],
      canArchive: false,
      canUnarchive: false,
      lockedAuthorIds: [],
    })
  })
})

describe('getItemAbilities: published item', () => {
  it('shows an own published item read-only to a contributor (PERM-2, ITEM-8a)', () => {
    expect(getItemAbilities(CONTRIBUTOR, item({ status: 'published' }))).toEqual({
      mode: 'published-read-only',
      lockedStatuses: ['published'],
      canArchive: false,
      canUnarchive: false,
      lockedAuthorIds: [],
    })
  })

  it('lets an editor change and archive a published item (PERM-4, PERM-5)', () => {
    expect(getItemAbilities(EDITOR, item({ status: 'published' }))).toEqual({
      mode: 'edit',
      lockedStatuses: [],
      canArchive: true,
      canUnarchive: false,
      lockedAuthorIds: [],
    })
  })
})

describe('getItemAbilities: edit', () => {
  it.each(UNPUBLISHED)(
    'lets a contributor edit and archive an own %s item, with the own chip locked (PERM-2, PERM-3, PERM-5, AUTH-2)',
    (status) => {
      expect(getItemAbilities(CONTRIBUTOR, item({ status }))).toEqual({
        mode: 'edit',
        lockedStatuses: ['published'],
        canArchive: true,
        canUnarchive: false,
        lockedAuthorIds: [2],
      })
    },
  )

  it('does not lock a chip for a contributor who is the creator but not an author (AUTH-2)', () => {
    expect(
      getItemAbilities(CONTRIBUTOR, item({ authors: [{ id: 3, name: 'Mette Holm' }] }))
        .lockedAuthorIds,
    ).toEqual([])
  })

  it.each(UNPUBLISHED)(
    'lets an editor set any status and change all authors on a %s item (AUTH-3, PERM-4)',
    (status) => {
      expect(
        getItemAbilities(EDITOR, item({ status, authors: [{ id: 1, name: 'Jonas Berg' }] })),
      ).toEqual({
        mode: 'edit',
        lockedStatuses: [],
        canArchive: true,
        canUnarchive: false,
        lockedAuthorIds: [],
      })
    },
  )
})

describe('getLockedStatuses (ITEM-4, PERM-3)', () => {
  it('locks nothing for an editor', () => {
    expect(getLockedStatuses('editor')).toEqual([])
  })

  it('locks published for a contributor', () => {
    expect(getLockedStatuses('contributor')).toEqual(['published'])
  })
})

describe('getItemMode (PERM-2, PERM-6)', () => {
  it('is archived for an archived item, for both roles and every status', () => {
    for (const status of [...UNPUBLISHED, 'published' as const]) {
      expect(getItemMode('editor', { archived: true, status })).toBe('archived')
      expect(getItemMode('contributor', { archived: true, status })).toBe('archived')
    }
  })

  it('is published-read-only for a contributor and a published item', () => {
    expect(getItemMode('contributor', { archived: false, status: 'published' })).toBe(
      'published-read-only',
    )
  })

  it('is edit for an editor and a published item', () => {
    expect(getItemMode('editor', { archived: false, status: 'published' })).toBe('edit')
  })

  it('is edit for both roles and an unpublished item', () => {
    for (const status of UNPUBLISHED) {
      expect(getItemMode('editor', { archived: false, status })).toBe('edit')
      expect(getItemMode('contributor', { archived: false, status })).toBe('edit')
    }
  })
})
