import { describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { authorIds, sameIds, toDay } from './rules'

describe('toDay', () => {
  it('keeps a plain date', () => {
    expect(toDay('2026-11-20')).toBe('2026-11-20')
  })

  it('cuts the time from an ISO timestamp', () => {
    expect(toDay('2026-11-20T00:00:00.000Z')).toBe('2026-11-20')
  })

  it('gives null for no deadline', () => {
    expect(toDay(null)).toBeNull()
    expect(toDay(undefined)).toBeNull()
    expect(toDay('')).toBeNull()
  })
})

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
