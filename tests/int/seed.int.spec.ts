import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { ContentItem, User } from '@/payload-types'
import { authorIds } from '@/collections/ContentItems/rules'
import { DEMO_USERS, seed } from '@/seed/seed'

// This file has its own database, and test.env turns off the seed on start.

let payload: Payload
let users: User[]
let items: ContentItem[]

const SEEDED_ITEM_COUNT = 10

/** The id of a relationship value at depth 0. */
const idOf = (value: ContentItem['createdBy']): number | null =>
  value === null || value === undefined ? null : typeof value === 'number' ? value : value.id

beforeAll(async () => {
  payload = await getPayload({ config })
  await seed(payload)
  users = (await payload.find({ collection: 'users', pagination: false })).docs
  items = (await payload.find({ collection: 'content-items', pagination: false, depth: 0 })).docs
})

describe('Seed (ROLE-4)', () => {
  it('creates 1 editor and 2 contributors', () => {
    expect(users.map(({ name, email, role }) => ({ name, email, role }))).toEqual(
      expect.arrayContaining([...DEMO_USERS]),
    )
    expect(users).toHaveLength(DEMO_USERS.length)
  })

  it('creates the demo items', () => {
    expect(items).toHaveLength(SEEDED_ITEM_COUNT)
  })

  it('sets publishedAt on published items (MODEL-2)', () => {
    const published = items.filter((item) => item.status === 'published')
    expect(published.length).toBeGreaterThan(0)
    for (const item of published) expect(item.publishedAt).toBeTruthy()
  })

  it('sets createdBy and puts the creator in authors (MODEL-1, AUTH-1)', () => {
    for (const item of items) {
      const creator = idOf(item.createdBy)
      expect(creator).not.toBeNull()
      expect(authorIds(item.authors)).toContain(creator)
    }
  })

  it('shows a contributor only own items (PERM-1)', async () => {
    const mette = users.find((user) => user.email === 'mette@example.com')
    if (!mette) throw new Error('No demo user mette@example.com')

    const own = items
      .filter(
        (item) => idOf(item.createdBy) === mette.id || authorIds(item.authors).includes(mette.id),
      )
      .map((item) => item.id)
    const visible = await payload.find({
      collection: 'content-items',
      pagination: false,
      user: mette,
      overrideAccess: false,
    })

    expect(own.length).toBeGreaterThan(0)
    expect(own.length).toBeLessThan(items.length)
    const byId = (a: number, b: number) => a - b
    expect(visible.docs.map((item) => item.id).sort(byId)).toEqual(own.sort(byId))
  })

  it('creates nothing on a second run', async () => {
    await seed(payload)

    expect((await payload.count({ collection: 'users' })).totalDocs).toBe(DEMO_USERS.length)
    expect((await payload.count({ collection: 'content-items' })).totalDocs).toBe(SEEDED_ITEM_COUNT)
  })
})
