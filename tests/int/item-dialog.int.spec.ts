import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { authorIds } from '@/collections/ContentItems/rules'
import { getItemDialogData } from '@/lib/item/detail'
import { createItemAs, setArchivedAs, updateItemAs } from '@/lib/item/save'
import type { ItemInput } from '@/lib/item/types'
import type { ContentItem, User } from '@/payload-types'

import { createUser, readItem, seedItem } from './helpers'

let payload: Payload
let editor: User
let contributor: User
let other: User

const STALE = 'You cannot change this item now. Close it and open it again.'

const input = (values: Partial<ItemInput> = {}): ItemInput => ({
  title: 'An item',
  status: 'idea',
  type: 'article',
  deadline: null,
  authors: [],
  ...values,
})

/** The item values as an input, with changes. */
const inputFrom = (item: ContentItem, values: Partial<ItemInput> = {}): ItemInput => ({
  title: item.title,
  status: item.status,
  type: item.type,
  deadline: item.deadline ?? null,
  authors: authorIds(item.authors),
  ...values,
})

beforeAll(async () => {
  payload = await getPayload({ config })
  editor = await createUser(payload, {
    name: 'Item Editor',
    email: 'item-editor@example.com',
    role: 'editor',
  })
  contributor = await createUser(payload, {
    name: 'Item Contributor',
    email: 'item-contributor@example.com',
    role: 'contributor',
  })
  other = await createUser(payload, {
    name: 'Another Contributor',
    email: 'item-other@example.com',
    role: 'contributor',
  })
})

describe('createItemAs', () => {
  it('ITEM-11, AUTH-1, MODEL-1: a contributor creates an idea; the creator is an author and createdBy', async () => {
    const result = await createItemAs(
      payload,
      contributor,
      input({ title: '  New idea  ', authors: [other.id] }),
    )
    expect(result).toMatchObject({ ok: true })
    if (!result.ok) return
    const item = await readItem(payload, result.id)
    expect(item).toMatchObject({ title: 'New idea', status: 'idea', archived: false })
    expect(authorIds(item.authors)).toEqual([other.id, contributor.id])
    expect(item.createdBy).toBe(contributor.id)
  })

  it('an empty title gives a field error and saves nothing', async () => {
    const before = await payload.count({ collection: 'content-items' })
    const result = await createItemAs(payload, contributor, input({ title: '   ' }))
    expect(result).toEqual({ ok: false, reason: 'invalid', errors: { title: 'Enter a title.' } })
    expect(await payload.count({ collection: 'content-items' })).toEqual(before)
  })

  it('a malformed input gives field errors', async () => {
    const result = await createItemAs(payload, contributor, 'not an object')
    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('PERM-3: a contributor cannot create a published item; nothing is saved', async () => {
    const before = await payload.count({ collection: 'content-items' })
    const result = await createItemAs(
      payload,
      contributor,
      input({ title: 'Published by contributor', status: 'published' }),
    )
    expect(result).toEqual({
      ok: false,
      reason: 'rejected',
      message: 'Only editors can publish items.',
    })
    expect(await payload.count({ collection: 'content-items' })).toEqual(before)
  })

  it('an unknown author id gives a field error and saves nothing', async () => {
    const before = await payload.count({ collection: 'content-items' })
    const result = await createItemAs(
      payload,
      editor,
      input({ title: 'Unknown author', authors: [999999] }),
    )
    expect(result).toEqual({
      ok: false,
      reason: 'invalid',
      errors: { authors: 'Choose valid authors.' },
    })
    expect(await payload.count({ collection: 'content-items' })).toEqual(before)
  })
})

describe('updateItemAs', () => {
  it('an editor changes all fields in one update', async () => {
    const item = await seedItem(payload, { createdBy: contributor, authors: [contributor] })
    const values = input({
      title: 'Changed',
      status: 'review',
      type: 'podcast',
      deadline: '2026-12-24',
      authors: [other.id, contributor.id],
    })
    expect(await updateItemAs(payload, editor, item.id, values)).toEqual({ ok: true, id: item.id })
    const saved = await readItem(payload, item.id)
    expect(saved).toMatchObject({
      title: 'Changed',
      status: 'review',
      type: 'podcast',
      deadline: '2026-12-24',
    })
    expect(authorIds(saved.authors)).toEqual([other.id, contributor.id])
  })

  it('an editor removes the deadline', async () => {
    const item = await seedItem(payload, {
      createdBy: editor,
      authors: [editor],
      deadline: '2026-12-01',
    })
    const result = await updateItemAs(payload, editor, item.id, inputFrom(item, { deadline: null }))
    expect(result).toEqual({ ok: true, id: item.id })
    expect((await readItem(payload, item.id)).deadline ?? null).toBeNull()
  })

  it('ITEM-6: an editor publishes with an empty title; the status does not change', async () => {
    const item = await seedItem(payload, { createdBy: editor, authors: [editor], status: 'review' })
    const result = await updateItemAs(
      payload,
      editor,
      item.id,
      inputFrom(item, { title: '', status: 'published' }),
    )
    expect(result).toEqual({ ok: false, reason: 'invalid', errors: { title: 'Enter a title.' } })
    expect(await readItem(payload, item.id)).toMatchObject({ status: 'review', publishedAt: null })
  })

  it('ITEM-6, MODEL-2: an editor publishes; publishedAt is set', async () => {
    const item = await seedItem(payload, { createdBy: editor, authors: [editor], status: 'review' })
    const result = await updateItemAs(
      payload,
      editor,
      item.id,
      inputFrom(item, { status: 'published' }),
    )
    expect(result).toEqual({ ok: true, id: item.id })
    const saved = await readItem(payload, item.id)
    expect(saved.status).toBe('published')
    expect(saved.publishedAt).toEqual(expect.any(String))
  })

  it('PERM-3: a contributor cannot publish; the status does not change', async () => {
    const item = await seedItem(payload, {
      createdBy: contributor,
      authors: [contributor],
      status: 'review',
    })
    const result = await updateItemAs(
      payload,
      contributor,
      item.id,
      inputFrom(item, { status: 'published' }),
    )
    expect(result).toEqual({
      ok: false,
      reason: 'rejected',
      message: 'Only editors can publish items.',
    })
    expect((await readItem(payload, item.id)).status).toBe('review')
  })

  it('AUTH-2: a contributor cannot remove themselves from the authors', async () => {
    const item = await seedItem(payload, { createdBy: contributor, authors: [contributor, other] })
    const result = await updateItemAs(
      payload,
      contributor,
      item.id,
      inputFrom(item, { authors: [other.id] }),
    )
    expect(result).toEqual({
      ok: false,
      reason: 'rejected',
      message: 'You cannot remove yourself from the authors. Ask an editor to do it.',
    })
    expect(authorIds((await readItem(payload, item.id)).authors)).toEqual([
      contributor.id,
      other.id,
    ])
  })

  it('ADR 0012: an unknown author id gives a field error and saves nothing', async () => {
    const item = await seedItem(payload, { createdBy: editor, authors: [editor] })
    const result = await updateItemAs(
      payload,
      editor,
      item.id,
      inputFrom(item, { title: 'Changed', authors: [editor.id, 999999] }),
    )
    expect(result).toEqual({
      ok: false,
      reason: 'invalid',
      errors: { authors: 'Choose valid authors.' },
    })
    const saved = await readItem(payload, item.id)
    expect(saved.title).toBe('Seeded')
    expect(authorIds(saved.authors)).toEqual([editor.id])
  })

  it('PERM-6: an archived item cannot be changed', async () => {
    const item = await seedItem(payload, { createdBy: editor, authors: [editor], archived: true })
    const result = await updateItemAs(
      payload,
      editor,
      item.id,
      inputFrom(item, { title: 'Changed' }),
    )
    expect(result).toEqual({
      ok: false,
      reason: 'rejected',
      message: 'This item is archived. Unarchive it before you change it.',
    })
    expect((await readItem(payload, item.id)).title).toBe('Seeded')
  })

  it('ERR-3: a contributor who is no longer an author gets no-access', async () => {
    const item = await seedItem(payload, { createdBy: other, authors: [other, contributor] })
    const removed = await updateItemAs(
      payload,
      editor,
      item.id,
      inputFrom(item, { authors: [other.id] }),
    )
    expect(removed).toEqual({ ok: true, id: item.id })
    const result = await updateItemAs(
      payload,
      contributor,
      item.id,
      inputFrom(item, { title: 'Too late' }),
    )
    expect(result).toEqual({ ok: false, reason: 'no-access' })
    expect((await readItem(payload, item.id)).title).toBe('Seeded')
  })

  it('PERM-2: a contributor saves after an editor published the item; the change is rejected', async () => {
    const item = await seedItem(payload, { createdBy: contributor, authors: [contributor] })
    await updateItemAs(payload, editor, item.id, inputFrom(item, { status: 'published' }))
    const result = await updateItemAs(
      payload,
      contributor,
      item.id,
      inputFrom(item, { title: 'Too late' }),
    )
    expect(result).toEqual({ ok: false, reason: 'rejected', message: STALE })
    expect(await readItem(payload, item.id)).toMatchObject({ title: 'Seeded', status: 'published' })
  })

  it('ERR-3: an editor updates a missing item and gets no-access', async () => {
    expect(await updateItemAs(payload, editor, 999999, input())).toEqual({
      ok: false,
      reason: 'no-access',
    })
  })

  it("PERM-1: a contributor updates another user's item and gets no-access", async () => {
    const item = await seedItem(payload, { createdBy: other, authors: [other] })
    expect(await updateItemAs(payload, contributor, item.id, inputFrom(item))).toEqual({
      ok: false,
      reason: 'no-access',
    })
  })

  it.each([
    ['text', 'abc'],
    ['zero', 0],
    ['a negative number', -1],
    ['a fraction', 1.5],
    ['a numeric string', '1'],
    ['null', null],
  ])('a malformed id (%s) gives no-access', async (_name, id) => {
    expect(await updateItemAs(payload, editor, id, input())).toEqual({
      ok: false,
      reason: 'no-access',
    })
  })

  it('an invalid input gives field errors', async () => {
    const item = await seedItem(payload, { createdBy: editor, authors: [editor] })
    const result = await updateItemAs(payload, editor, item.id, { ...input(), deadline: 'x' })
    expect(result).toEqual({
      ok: false,
      reason: 'invalid',
      errors: { deadline: 'Use a real date.' },
    })
  })
})

describe('setArchivedAs', () => {
  it('ITEM-8: an editor archives and unarchives an item', async () => {
    const item = await seedItem(payload, { createdBy: contributor, authors: [contributor] })
    expect(await setArchivedAs(payload, editor, item.id, true)).toEqual({ ok: true, id: item.id })
    expect((await readItem(payload, item.id)).archived).toBe(true)
    expect(await setArchivedAs(payload, editor, item.id, false)).toEqual({ ok: true, id: item.id })
    expect((await readItem(payload, item.id)).archived).toBe(false)
  })

  it('PERM-5: a contributor archives and unarchives an own item', async () => {
    const item = await seedItem(payload, { createdBy: contributor, authors: [contributor] })
    expect(await setArchivedAs(payload, contributor, item.id, true)).toEqual({
      ok: true,
      id: item.id,
    })
    expect(await setArchivedAs(payload, contributor, item.id, false)).toEqual({
      ok: true,
      id: item.id,
    })
    expect((await readItem(payload, item.id)).archived).toBe(false)
  })

  it('PERM-2, PERM-5: a contributor cannot unarchive an own published item', async () => {
    const item = await seedItem(payload, {
      createdBy: contributor,
      authors: [contributor],
      status: 'published',
      archived: true,
    })
    expect(await setArchivedAs(payload, contributor, item.id, false)).toEqual({
      ok: false,
      reason: 'rejected',
      message: STALE,
    })
    expect((await readItem(payload, item.id)).archived).toBe(true)
  })

  it('a value that is not a boolean is rejected', async () => {
    const item = await seedItem(payload, { createdBy: editor, authors: [editor] })
    expect(await setArchivedAs(payload, editor, item.id, 'yes')).toEqual({
      ok: false,
      reason: 'rejected',
      message: 'The change is not valid.',
    })
    expect((await readItem(payload, item.id)).archived).toBe(false)
  })

  it('a malformed id gives no-access', async () => {
    expect(await setArchivedAs(payload, editor, 'abc', true)).toEqual({
      ok: false,
      reason: 'no-access',
    })
  })

  it('ERR-3: an editor archives a missing item and gets no-access', async () => {
    expect(await setArchivedAs(payload, editor, 999999, true)).toEqual({
      ok: false,
      reason: 'no-access',
    })
  })
})

describe('getItemDialogData', () => {
  it('ITEM-3: a new item gives the users by name, with id, name and role only', async () => {
    const state = await getItemDialogData(payload, contributor, { kind: 'new' })
    expect(state.kind).toBe('new')
    if (state.kind !== 'new') return
    const names = state.users.map((user) => user.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    expect(state.users).toContainEqual({
      id: editor.id,
      name: 'Item Editor',
      role: 'editor',
    })
    for (const user of state.users) {
      expect(Object.keys(user).sort()).toEqual(['id', 'name', 'role'])
    }
  })

  it('ITEM-12: a missing item is not found', async () => {
    expect(await getItemDialogData(payload, editor, { kind: 'id', id: 999999 })).toEqual({
      kind: 'not-found',
    })
  })

  it('ITEM-12: a malformed id is not found', async () => {
    expect(await getItemDialogData(payload, editor, { kind: 'invalid' })).toEqual({
      kind: 'not-found',
    })
  })

  it("ITEM-12, PERM-1: another contributor's item is not found", async () => {
    const item = await seedItem(payload, { createdBy: other, authors: [other] })
    expect(await getItemDialogData(payload, contributor, { kind: 'id', id: item.id })).toEqual({
      kind: 'not-found',
    })
  })

  it('ITEM-3: an own item gives the detail, with the authors in the stored order', async () => {
    const item = await seedItem(payload, {
      createdBy: contributor,
      authors: [other, contributor],
      title: 'Detail',
      status: 'draft',
      type: 'video',
      deadline: '2026-12-31',
    })
    const state = await getItemDialogData(payload, contributor, { kind: 'id', id: item.id })
    expect(state.kind).toBe('edit')
    if (state.kind !== 'edit') return
    expect(state.item).toEqual({
      id: item.id,
      title: 'Detail',
      status: 'draft',
      type: 'video',
      deadline: '2026-12-31',
      archived: false,
      authors: [
        { id: other.id, name: 'Another Contributor' },
        { id: contributor.id, name: 'Item Contributor' },
      ],
      creatorName: 'Item Contributor',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      publishedAt: null,
    })
    expect(state.users.length).toBeGreaterThanOrEqual(3)
    for (const user of state.users) {
      expect(Object.keys(user).sort()).toEqual(['id', 'name', 'role'])
    }
  })

  it('ITEM-3: an item without a deadline or a creator gives null values', async () => {
    const item = await payload.create({
      collection: 'content-items',
      data: { title: 'No creator', type: 'article', status: 'idea', authors: [editor.id] },
    })
    const state = await getItemDialogData(payload, editor, { kind: 'id', id: item.id })
    expect(state.kind).toBe('edit')
    if (state.kind !== 'edit') return
    expect(state.item).toMatchObject({ deadline: null, creatorName: null, publishedAt: null })
  })
})
