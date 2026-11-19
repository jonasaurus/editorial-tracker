import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { ContentItem, User } from '@/payload-types'

import { createActor, transports, type Actor } from './helpers'

let payload: Payload

type ItemInput = Partial<Pick<ContentItem, 'status' | 'archived' | 'deadline'>> & {
  createdBy: User
  authors: User[]
}

let itemCount = 0

/** Creates an item for test setup. Access control is off, and no user means no value rules. */
function createItem({ createdBy, authors, ...rest }: ItemInput): Promise<ContentItem> {
  itemCount += 1
  return payload.create({
    collection: 'content-items',
    data: {
      title: `Item ${itemCount}`,
      type: 'article',
      status: 'idea',
      ...rest,
      createdBy: createdBy.id,
      authors: authors.map((author) => author.id),
    },
  })
}

/** The ids in a relationship list. */
const ids = (authors: ContentItem['authors']) =>
  (authors ?? []).map((author) => (typeof author === 'number' ? author : author.id)).sort()

/** The id of a relationship value. */
const idOf = (value: ContentItem['createdBy']) =>
  typeof value === 'object' && value !== null ? value.id : value

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe.each(transports)('Content items: value rules ($name)', (t) => {
  let editor: Actor
  let contributor: Actor
  let other: Actor

  /** An item that the contributor created and authors. */
  const ownItem = (input: Partial<ItemInput> = {}) =>
    createItem({ createdBy: contributor.user, authors: [contributor.user], ...input })

  beforeAll(async () => {
    editor = await createActor(payload, {
      name: 'Editor',
      email: `${t.name}-rules-editor@example.com`,
      role: 'editor',
    })
    contributor = await createActor(payload, {
      name: 'Contributor',
      email: `${t.name}-rules-contributor@example.com`,
      role: 'contributor',
    })
    other = await createActor(payload, {
      name: 'Other',
      email: `${t.name}-rules-other@example.com`,
      role: 'contributor',
    })
  })

  describe('MODEL-1 createdBy', () => {
    it('MODEL-1 sets createdBy to the logged-in user, not to the sent value', async () => {
      const result = await t.create(contributor, 'content-items', {
        title: 'New',
        type: 'video',
        createdBy: other.user.id,
      })

      expect(result.status).toBe(201)
      expect(idOf(result.doc?.createdBy)).toBe(contributor.user.id)
    })

    it('MODEL-1 keeps createdBy when an update sends another value', async () => {
      const item = await ownItem()

      const result = await t.update(editor, 'content-items', item.id, {
        createdBy: other.user.id,
      })

      expect(result.status).toBe(200)
      expect(idOf(result.doc?.createdBy)).toBe(contributor.user.id)
    })
  })

  describe('MODEL-2 publishedAt', () => {
    it('MODEL-2 sets publishedAt when an item is created as published', async () => {
      const result = await t.create(editor, 'content-items', {
        title: 'Published at once',
        type: 'article',
        status: 'published',
      })

      expect(result.status).toBe(201)
      expect(result.doc?.publishedAt).toEqual(expect.any(String))
    })

    it('MODEL-2 ignores a publishedAt that a request sends', async () => {
      const result = await t.create(editor, 'content-items', {
        title: 'Idea with a date',
        type: 'article',
        publishedAt: '2020-01-01T00:00:00.000Z',
      })

      expect(result.doc?.publishedAt ?? null).toBeNull()
    })

    it('MODEL-2 sets publishedAt on publish, keeps it on unpublish and sets it again on republish', async () => {
      const item = await ownItem({ status: 'review' })

      const published = await t.update(editor, 'content-items', item.id, { status: 'published' })
      const first = published.doc?.publishedAt
      expect(first).toEqual(expect.any(String))

      const unpublished = await t.update(editor, 'content-items', item.id, { status: 'review' })
      expect(unpublished.doc?.publishedAt).toBe(first)

      await new Promise((resolve) => setTimeout(resolve, 5))
      const republished = await t.update(editor, 'content-items', item.id, { status: 'published' })
      expect(republished.doc?.publishedAt).not.toBe(first)
    })
  })

  describe('PERM-3 and PERM-4 status', () => {
    it('PERM-3 forbids a contributor to create a published item', async () => {
      const result = await t.create(contributor, 'content-items', {
        title: 'Sneaky',
        type: 'article',
        status: 'published',
      })

      expect(result.status).toBe(403)
      expect(result.message).toBe('Only editors can publish items.')
    })

    it('PERM-3 forbids a contributor to publish an own item', async () => {
      const item = await ownItem({ status: 'review' })

      const result = await t.update(contributor, 'content-items', item.id, { status: 'published' })

      expect(result.status).toBe(403)
      expect(result.message).toBe('Only editors can publish items.')
      const stored = await payload.findByID({ collection: 'content-items', id: item.id })
      expect(stored.status).toBe('review')
    })

    it('PERM-3 forbids a contributor to unpublish an own item', async () => {
      const item = await ownItem({ status: 'published' })

      const result = await t.update(contributor, 'content-items', item.id, { status: 'review' })

      expect(result.status).toBe(403)
    })

    it('PERM-3 lets an editor publish and unpublish', async () => {
      const item = await ownItem({ status: 'review' })

      const published = await t.update(editor, 'content-items', item.id, { status: 'published' })
      const unpublished = await t.update(editor, 'content-items', item.id, { status: 'idea' })

      expect(published.status).toBe(200)
      expect(unpublished.status).toBe(200)
      expect(unpublished.doc?.status).toBe('idea')
    })

    it('PERM-4 lets a contributor move between idea, draft and review in any order', async () => {
      const item = await ownItem({ status: 'idea' })

      for (const status of ['review', 'idea', 'draft', 'review', 'draft']) {
        const result = await t.update(contributor, 'content-items', item.id, { status })
        expect(result.status).toBe(200)
        expect(result.doc?.status).toBe(status)
      }
    })
  })

  describe('PERM-5 archive', () => {
    it('PERM-5 lets a contributor archive and unarchive an own unpublished item', async () => {
      const item = await ownItem({ status: 'draft' })

      const archived = await t.update(contributor, 'content-items', item.id, { archived: true })
      const unarchived = await t.update(contributor, 'content-items', item.id, { archived: false })

      expect(archived.status).toBe(200)
      expect(unarchived.status).toBe(200)
      expect(unarchived.doc?.archived).toBe(false)
    })

    it('PERM-5 forbids a contributor to archive an own published item', async () => {
      const item = await ownItem({ status: 'published' })

      const result = await t.update(contributor, 'content-items', item.id, { archived: true })

      expect(result.status).toBe(403)
    })

    it('PERM-5 forbids a contributor to unarchive an own published item', async () => {
      const item = await ownItem({ status: 'published', archived: true })

      const result = await t.update(contributor, 'content-items', item.id, { archived: false })

      expect(result.status).toBe(403)
    })

    it('PERM-5 lets an editor archive and unarchive a published item', async () => {
      const item = await ownItem({ status: 'published' })

      const archived = await t.update(editor, 'content-items', item.id, { archived: true })
      const unarchived = await t.update(editor, 'content-items', item.id, { archived: false })

      expect(archived.status).toBe(200)
      expect(unarchived.status).toBe(200)
    })
  })

  describe('PERM-6 archived items are read-only', () => {
    it.each([
      ['title', { title: 'Changed' }],
      ['status', { status: 'draft' }],
      ['type', { type: 'podcast' }],
      ['deadline', { deadline: '2030-01-01' }],
    ])('PERM-6 rejects a change to the %s of an archived item', async (_field, change) => {
      const item = await ownItem({ status: 'idea', archived: true })

      const result = await t.update(editor, 'content-items', item.id, change)

      expect(result.status).toBe(403)
      expect(result.message).toBe('This item is archived. Unarchive it before you change it.')
    })

    it('PERM-6 rejects a change to the authors of an archived item', async () => {
      const item = await ownItem({ archived: true })

      const result = await t.update(editor, 'content-items', item.id, {
        authors: [contributor.user.id, other.user.id],
      })

      expect(result.status).toBe(403)
    })

    it('PERM-6 rejects unarchive together with another change', async () => {
      const item = await ownItem({ archived: true })

      const result = await t.update(contributor, 'content-items', item.id, {
        archived: false,
        title: 'Changed',
      })

      expect(result.status).toBe(403)
      const stored = await payload.findByID({ collection: 'content-items', id: item.id })
      expect(stored.archived).toBe(true)
    })

    it('PERM-6 accepts unarchive that sends the unchanged fields', async () => {
      const item = await ownItem({ status: 'draft', archived: true, deadline: '2026-12-01' })

      const result = await t.update(contributor, 'content-items', item.id, {
        archived: false,
        title: item.title,
        status: 'draft',
        type: item.type,
        deadline: '2026-12-01',
        authors: [contributor.user.id],
      })

      expect(result.status).toBe(200)
      expect(result.doc?.archived).toBe(false)
    })
  })

  describe('AUTH-1 to AUTH-3 authors', () => {
    it('AUTH-1 adds the creator to the authors of a new item', async () => {
      const result = await t.create(contributor, 'content-items', {
        title: 'No authors sent',
        type: 'podcast',
      })

      expect(ids(result.doc?.authors)).toEqual([contributor.user.id])
    })

    it('AUTH-1 adds the creator when the sent authors do not include them', async () => {
      const result = await t.create(editor, 'content-items', {
        title: 'Other author sent',
        type: 'newsletter',
        authors: [other.user.id],
      })

      expect(ids(result.doc?.authors)).toEqual([editor.user.id, other.user.id].sort())
    })

    it('AUTH-2 forbids a contributor to remove themselves from the authors', async () => {
      const item = await ownItem({ authors: [contributor.user, other.user] })

      const result = await t.update(contributor, 'content-items', item.id, {
        authors: [other.user.id],
      })

      expect(result.status).toBe(403)
      expect(result.message).toBe(
        'You cannot remove yourself from the authors. Ask an editor to do it.',
      )
    })

    it('AUTH-2 lets a contributor add and remove other authors', async () => {
      const item = await ownItem()

      const added = await t.update(contributor, 'content-items', item.id, {
        authors: [contributor.user.id, other.user.id],
      })
      const removed = await t.update(contributor, 'content-items', item.id, {
        authors: [contributor.user.id],
      })

      expect(added.status).toBe(200)
      expect(removed.status).toBe(200)
      expect(ids(removed.doc?.authors)).toEqual([contributor.user.id])
    })

    it('AUTH-3 lets an editor change the authors freely, also to none', async () => {
      const item = await ownItem({ authors: [contributor.user, other.user] })

      const result = await t.update(editor, 'content-items', item.id, { authors: [] })

      expect(result.status).toBe(200)
      expect(ids(result.doc?.authors)).toEqual([])
    })
  })

  describe('deadline (ADR 0007)', () => {
    /** The stored value, read without access control. */
    const storedDeadline = async (id: number) =>
      (await payload.findByID({ collection: 'content-items', id })).deadline

    it('stores a plain date as YYYY-MM-DD on create', async () => {
      const result = await t.create(contributor, 'content-items', {
        title: 'Plain date',
        type: 'article',
        deadline: '2026-11-20',
      })

      expect(result.doc?.deadline).toBe('2026-11-20')
      expect(await storedDeadline(result.doc?.id ?? 0)).toBe('2026-11-20')
    })

    it.each([
      ['a timestamp', '2026-12-24T00:00:00.000Z'],
      ['a day that does not exist', '2026-02-30'],
    ])('rejects %s', async (_name, deadline) => {
      const item = await ownItem({ deadline: '2026-11-30' })

      const result = await t.update(contributor, 'content-items', item.id, { deadline })

      expect(result.status).toBe(400)
      expect(await storedDeadline(item.id)).toBe('2026-11-30')
    })

    it('stores an empty deadline as no deadline', async () => {
      const item = await ownItem({ deadline: '2026-11-30' })

      const result = await t.update(contributor, 'content-items', item.id, { deadline: '' })

      expect(result.status).toBe(200)
      expect(await storedDeadline(item.id)).toBeNull()
    })

    it('keeps YYYY-MM-DD when an update does not send the deadline', async () => {
      const item = await ownItem({ deadline: '2026-11-30' })

      await t.update(contributor, 'content-items', item.id, { title: 'New title' })

      expect(await storedDeadline(item.id)).toBe('2026-11-30')
    })
  })
})
