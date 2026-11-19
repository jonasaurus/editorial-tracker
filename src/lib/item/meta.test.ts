import { describe, expect, it } from 'vitest'

import { formatItemMeta } from './meta'

const TODAY = '2026-11-19'

const ITEM = {
  creatorName: 'Jonas Berg',
  createdAt: '2026-11-03T09:00:00.000Z',
  updatedAt: '2026-11-19T08:12:00.000Z',
  publishedAt: null,
  status: 'review',
  archived: false,
} as const

describe('formatItemMeta', () => {
  it('gives "Updated today 09:12" for an item in work (ITEM-3)', () => {
    expect(formatItemMeta(ITEM, TODAY)).toEqual({
      creatorName: 'Jonas Berg',
      created: '3 Nov',
      event: [{ text: 'Updated today 09:12', strong: false }],
    })
  })

  it('gives the date for an update before today', () => {
    expect(formatItemMeta({ ...ITEM, updatedAt: '2026-11-12T13:05:00.000Z' }, TODAY).event).toEqual(
      [{ text: 'Updated 12 Nov 14:05', strong: false }],
    )
  })

  it('gives "today" for an item created today', () => {
    expect(formatItemMeta({ ...ITEM, createdAt: '2026-11-19T07:00:00.000Z' }, TODAY).created).toBe(
      'today',
    )
  })

  it('uses the Copenhagen date, not the UTC date (DL-1)', () => {
    const item = {
      ...ITEM,
      createdAt: '2026-11-18T23:30:00.000Z',
      updatedAt: '2026-11-18T23:30:00.000Z',
    }
    expect(formatItemMeta(item, TODAY)).toEqual({
      creatorName: 'Jonas Berg',
      created: 'today',
      event: [{ text: 'Updated today 00:30', strong: false }],
    })
  })

  it('adds the year for a date in another year', () => {
    const item = {
      ...ITEM,
      createdAt: '2025-12-30T10:00:00.000Z',
      updatedAt: '2025-12-31T22:59:00.000Z',
    }
    expect(formatItemMeta(item, '2026-01-02')).toMatchObject({
      created: '30 Dec 2025',
      event: [{ text: 'Updated 31 Dec 2025 23:59', strong: false }],
    })
  })

  it('gives "Published … · updated …" for a published item (MODEL-2)', () => {
    const item = {
      ...ITEM,
      status: 'published',
      publishedAt: '2026-11-12T09:00:00.000Z',
      updatedAt: '2026-11-12T13:05:00.000Z',
    } as const
    expect(formatItemMeta(item, TODAY).event).toEqual([
      { text: 'Published 12 Nov', strong: true },
      { text: ' · updated 12 Nov 14:05', strong: false },
    ])
  })

  it('gives "today" in both parts for an item published and updated today', () => {
    const item = {
      ...ITEM,
      status: 'published',
      publishedAt: '2026-11-19T08:00:00.000Z',
      updatedAt: '2026-11-19T08:12:00.000Z',
    } as const
    expect(formatItemMeta(item, TODAY).event).toEqual([
      { text: 'Published today', strong: true },
      { text: ' · updated today 09:12', strong: false },
    ])
  })

  it('gives "Updated …" for an unpublished item that keeps publishedAt (MODEL-2)', () => {
    const item = { ...ITEM, status: 'review', publishedAt: '2026-11-12T09:00:00.000Z' } as const
    expect(formatItemMeta(item, TODAY).event).toEqual([
      { text: 'Updated today 09:12', strong: false },
    ])
  })

  it('gives "Updated …" for a published item without publishedAt', () => {
    expect(formatItemMeta({ ...ITEM, status: 'published' }, TODAY).event).toEqual([
      { text: 'Updated today 09:12', strong: false },
    ])
  })

  it('gives "Archived …" with the time of the last update (ITEM-8, MODEL-3)', () => {
    const item = { ...ITEM, archived: true, updatedAt: '2026-11-19T09:40:00.000Z' }
    expect(formatItemMeta(item, TODAY).event).toEqual([
      { text: 'Archived today 10:40', strong: true },
    ])
  })

  it('gives "Archived …" for an archived published item', () => {
    const item = {
      ...ITEM,
      archived: true,
      status: 'published',
      publishedAt: '2026-11-12T09:00:00.000Z',
      updatedAt: '2026-11-14T09:40:00.000Z',
    } as const
    expect(formatItemMeta(item, TODAY).event).toEqual([
      { text: 'Archived 14 Nov 10:40', strong: true },
    ])
  })

  it('gives a null creator name when the creator is gone', () => {
    expect(formatItemMeta({ ...ITEM, creatorName: null }, TODAY).creatorName).toBeNull()
  })
})
