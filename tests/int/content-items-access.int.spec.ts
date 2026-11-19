import config from '@payload-config'
import { getPayload, type Payload, type Where } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { ContentItem, User } from '@/payload-types'

import { createActor, transports, type Actor } from './helpers'

let payload: Payload

type ItemInput = Pick<ContentItem, 'title' | 'status'> & { createdBy: User; authors: User[] }

/** Creates an item for test setup. Access control is off. */
function createItem({ title, status, createdBy, authors }: ItemInput): Promise<ContentItem> {
  return payload.create({
    collection: 'content-items',
    data: {
      title,
      status,
      type: 'article',
      createdBy: createdBy.id,
      authors: authors.map((author) => author.id),
    },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('API-3 authors query operator', () => {
  let item: ContentItem
  let second: Actor

  beforeAll(async () => {
    const first = await createActor(payload, {
      name: 'First author',
      email: 'operator-first@example.com',
      role: 'contributor',
    })
    second = await createActor(payload, {
      name: 'Second author',
      email: 'operator-second@example.com',
      role: 'contributor',
    })
    item = await createItem({
      title: 'Two authors',
      status: 'idea',
      createdBy: first.user,
      authors: [first.user, second.user],
    })
  })

  it.each([
    ['equals', (id: number): Where => ({ authors: { equals: id } })],
    ['in', (id: number): Where => ({ authors: { in: [id] } })],
    ['contains', (id: number): Where => ({ authors: { contains: id } })],
  ])('finds an item by its second author with %s', async (_name, where) => {
    const result = await payload.find({
      collection: 'content-items',
      where: where(second.user.id),
    })

    expect(result.docs.map((doc) => doc.id)).toEqual([item.id])
  })
})

describe.each(transports)('Content items: row scope ($name)', (t) => {
  let editor: Actor
  let contributor: Actor
  let other: Actor
  let created: ContentItem
  let authored: ContentItem
  let othersItem: ContentItem
  let ownPublished: ContentItem

  beforeAll(async () => {
    editor = await createActor(payload, {
      name: 'Editor',
      email: `${t.name}-items-editor@example.com`,
      role: 'editor',
    })
    contributor = await createActor(payload, {
      name: 'Contributor',
      email: `${t.name}-items-contributor@example.com`,
      role: 'contributor',
    })
    other = await createActor(payload, {
      name: 'Other',
      email: `${t.name}-items-other@example.com`,
      role: 'contributor',
    })
    created = await createItem({
      title: `${t.name} created`,
      status: 'idea',
      createdBy: contributor.user,
      authors: [other.user],
    })
    authored = await createItem({
      title: `${t.name} authored`,
      status: 'draft',
      createdBy: other.user,
      authors: [other.user, contributor.user],
    })
    othersItem = await createItem({
      title: `${t.name} others`,
      status: 'review',
      createdBy: other.user,
      authors: [other.user],
    })
    ownPublished = await createItem({
      title: `${t.name} own published`,
      status: 'published',
      createdBy: contributor.user,
      authors: [contributor.user],
    })
  })

  const titlePrefix = () => ({ title: { like: `${t.name} ` } })

  it('rejects a read without a login', async () => {
    const result = await t.find(null, 'content-items')

    expect(result.status).toBe(403)
  })

  it('PERM-1 lists only own items for a contributor (creator or author)', async () => {
    const result = await t.find(contributor, 'content-items', titlePrefix())

    expect(result.status).toBe(200)
    expect(result.docs?.map((doc) => doc.id).sort()).toEqual(
      [created.id, authored.id, ownPublished.id].sort(),
    )
  })

  it('PERM-1 hides the item of another user from a contributor', async () => {
    const result = await t.findByID(contributor, 'content-items', othersItem.id)

    expect(result.status).toBe(404)
  })

  it('PERM-1 lists all items for an editor', async () => {
    const result = await t.find(editor, 'content-items', titlePrefix())

    expect(result.docs).toHaveLength(4)
  })

  it('PERM-2 lets a contributor update an own item that is not published', async () => {
    const result = await t.update(contributor, 'content-items', authored.id, {
      title: `${t.name} authored`,
    })

    expect(result.status).toBe(200)
  })

  it('PERM-2 forbids a contributor to update an own published item', async () => {
    const result = await t.update(contributor, 'content-items', ownPublished.id, {
      title: 'Changed',
    })

    expect(result.status).toBe(403)
  })

  it('PERM-2 forbids a contributor to update the item of another user', async () => {
    const result = await t.update(contributor, 'content-items', othersItem.id, {
      title: 'Changed',
    })

    expect(result.status).toBe(403)
  })

  it('PERM-2 lets an editor update any item', async () => {
    const result = await t.update(editor, 'content-items', othersItem.id, {
      title: `${t.name} others`,
    })

    expect(result.status).toBe(200)
  })

  it('PERM-7 forbids a contributor to delete an own item', async () => {
    const result = await t.delete(contributor, 'content-items', created.id)

    expect(result.status).toBe(403)
  })

  it('PERM-7 lets an editor delete an item', async () => {
    const doomed = await createItem({
      title: 'To delete',
      status: 'idea',
      createdBy: contributor.user,
      authors: [contributor.user],
    })

    const result = await t.delete(editor, 'content-items', doomed.id)

    expect(result.status).toBe(200)
  })
})
