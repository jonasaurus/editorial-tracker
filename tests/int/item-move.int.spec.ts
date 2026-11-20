import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { moveItemAs } from '@/lib/item/save'
import type { User } from '@/payload-types'

import { createUser, readItem, seedItem } from './helpers'

let payload: Payload
let editor: User
let contributor: User
let other: User

beforeAll(async () => {
  payload = await getPayload({ config })
  editor = await createUser(payload, {
    name: 'Move Editor',
    email: 'move-editor@example.com',
    role: 'editor',
  })
  contributor = await createUser(payload, {
    name: 'Move Contributor',
    email: 'move-contributor@example.com',
    role: 'contributor',
  })
  other = await createUser(payload, {
    name: 'Move Other',
    email: 'move-other@example.com',
    role: 'contributor',
  })
})

describe('moveItemAs', () => {
  it('DND-1, PERM-3, MODEL-2: an editor moves a draft to published; publishedAt is set', async () => {
    const item = await seedItem(payload, {
      status: 'draft',
      createdBy: contributor,
      authors: [contributor],
    })
    const result = await moveItemAs(payload, editor, item.id, 'published')
    expect(result).toEqual({ ok: true, id: item.id })
    const saved = await readItem(payload, item.id)
    expect(saved.status).toBe('published')
    expect(saved.publishedAt).toEqual(expect.any(String))
    expect(saved.title).toBe(item.title)
  })

  it('DND-1, PERM-3: an editor moves a published item back to review (unpublish)', async () => {
    const item = await seedItem(payload, { status: 'draft', createdBy: editor, authors: [editor] })
    await moveItemAs(payload, editor, item.id, 'published')
    const result = await moveItemAs(payload, editor, item.id, 'review')
    expect(result).toEqual({ ok: true, id: item.id })
    const saved = await readItem(payload, item.id)
    expect(saved.status).toBe('review')
    // MODEL-2: publishedAt is kept after unpublish.
    expect(saved.publishedAt).toEqual(expect.any(String))
  })

  it('DND-1, PERM-4: a contributor moves an own draft to review', async () => {
    const item = await seedItem(payload, {
      status: 'draft',
      createdBy: contributor,
      authors: [contributor],
    })
    const result = await moveItemAs(payload, contributor, item.id, 'review')
    expect(result).toEqual({ ok: true, id: item.id })
    expect((await readItem(payload, item.id)).status).toBe('review')
  })

  it('PERM-3, DND-4: a contributor cannot move an own item to published; the status stays', async () => {
    const item = await seedItem(payload, {
      status: 'review',
      createdBy: contributor,
      authors: [contributor],
    })
    const result = await moveItemAs(payload, contributor, item.id, 'published')
    expect(result).toEqual({
      ok: false,
      reason: 'rejected',
      message: 'Only editors can publish items.',
    })
    const saved = await readItem(payload, item.id)
    expect(saved.status).toBe('review')
    expect(saved.publishedAt ?? null).toBeNull()
  })

  it('PERM-2, DND-4: a contributor cannot move an own published item; the status stays', async () => {
    const item = await seedItem(payload, {
      status: 'published',
      createdBy: contributor,
      authors: [contributor],
    })
    const result = await moveItemAs(payload, contributor, item.id, 'review')
    expect(result).toMatchObject({ ok: false, reason: 'rejected' })
    expect((await readItem(payload, item.id)).status).toBe('published')
  })

  it('PERM-2, ERR-3: a rejected access on a readable item gives the move stale text', async () => {
    const item = await seedItem(payload, {
      status: 'published',
      createdBy: contributor,
      authors: [contributor],
    })
    const result = await moveItemAs(payload, contributor, item.id, 'draft')
    // Access blocks the update before the rule runs, so the re-read decides (ERR-3).
    expect(result).toEqual({
      ok: false,
      reason: 'rejected',
      message: 'This item changed on the server.',
    })
  })

  it('PERM-6, DND-4: an editor cannot move an archived item; the status stays', async () => {
    const item = await seedItem(payload, {
      status: 'draft',
      archived: true,
      createdBy: editor,
      authors: [editor],
    })
    const result = await moveItemAs(payload, editor, item.id, 'review')
    expect(result).toEqual({
      ok: false,
      reason: 'rejected',
      message: 'This item is archived. Unarchive it before you change it.',
    })
    expect((await readItem(payload, item.id)).status).toBe('draft')
  })

  it("PERM-1, ERR-3: a contributor gets no-access for another user's item; the status stays", async () => {
    const item = await seedItem(payload, { status: 'draft', createdBy: other, authors: [other] })
    const result = await moveItemAs(payload, contributor, item.id, 'review')
    expect(result).toEqual({ ok: false, reason: 'no-access' })
    expect((await readItem(payload, item.id)).status).toBe('draft')
  })

  it('ERR-3: a missing item gives no-access', async () => {
    const result = await moveItemAs(payload, editor, 99999, 'review')
    expect(result).toEqual({ ok: false, reason: 'no-access' })
  })

  it.each(['7', 0, -1, 1.5, null, undefined])('a malformed id (%j) gives no-access', async (id) => {
    const result = await moveItemAs(payload, editor, id, 'review')
    expect(result).toEqual({ ok: false, reason: 'no-access' })
  })

  it.each(['done', 7, null, undefined, 'Published'])(
    'a status that is not valid (%j) gives a field error; the status stays',
    async (status) => {
      const item = await seedItem(payload, {
        status: 'draft',
        createdBy: editor,
        authors: [editor],
      })
      const result = await moveItemAs(payload, editor, item.id, status)
      expect(result).toEqual({
        ok: false,
        reason: 'invalid',
        errors: { status: 'Choose a status.' },
      })
      expect((await readItem(payload, item.id)).status).toBe('draft')
    },
  )
})
