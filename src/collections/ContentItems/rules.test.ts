import { describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { authorIds, sameIds } from './rules'

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
