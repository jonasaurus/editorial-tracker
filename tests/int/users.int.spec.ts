import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { createActor, transports, type Actor } from './helpers'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe.each(transports)('Users ($name)', (t) => {
  let editor: Actor
  let contributor: Actor
  let otherContributor: Actor
  let count = 0

  /** A fresh contributor for a test that changes a user. */
  const freshContributor = () => {
    count += 1
    return createActor(payload, {
      name: `Fresh ${count}`,
      email: `${t.name}-fresh-${count}@example.com`,
      role: 'contributor',
    })
  }

  beforeAll(async () => {
    editor = await createActor(payload, {
      name: 'Editor',
      email: `${t.name}-editor@example.com`,
      role: 'editor',
    })
    contributor = await createActor(payload, {
      name: 'Contributor',
      email: `${t.name}-contributor@example.com`,
      role: 'contributor',
    })
    otherContributor = await createActor(payload, {
      name: 'Other contributor',
      email: `${t.name}-other@example.com`,
      role: 'contributor',
    })
  })

  it('ROLE-5 rejects a read of users without a login', async () => {
    const result = await t.find(null, 'users')

    expect(result.status).toBe(403)
  })

  it('ROLE-5 lets a logged-in contributor read all users', async () => {
    const result = await t.find(contributor, 'users', {
      email: { like: `${t.name}-` },
    })

    expect(result.status).toBe(200)
    expect(result.docs?.map((doc) => doc.email)).toEqual(
      expect.arrayContaining([editor.user.email, contributor.user.email]),
    )
  })

  it('ROLE-1 rejects a role that is not editor or contributor', async () => {
    const result = await t.create(editor, 'users', {
      name: 'Admin',
      email: `${t.name}-admin@example.com`,
      password: 'test-password',
      role: 'admin',
    })

    expect(result.status).toBe(400)
  })

  it('ROLE-2 ignores a contributor who changes their own role', async () => {
    const result = await t.update(contributor, 'users', contributor.user.id, { role: 'editor' })

    expect(result.status).toBe(200)
    expect(result.doc?.role).toBe('contributor')
    const stored = await payload.findByID({ collection: 'users', id: contributor.user.id })
    expect(stored.role).toBe('contributor')
  })

  it('ROLE-2 lets an editor change the role of a user', async () => {
    const target = await freshContributor()

    const result = await t.update(editor, 'users', target.user.id, { role: 'editor' })

    expect(result.status).toBe(200)
    expect(result.doc?.role).toBe('editor')
  })

  it('ROLE-6 forbids a contributor to create a user', async () => {
    const result = await t.create(contributor, 'users', {
      name: 'Created by contributor',
      email: `${t.name}-created@example.com`,
      password: 'test-password',
      role: 'contributor',
    })

    expect(result.status).toBe(403)
  })

  it('ROLE-6 forbids a contributor to change another user', async () => {
    const result = await t.update(contributor, 'users', otherContributor.user.id, {
      name: 'Changed',
    })

    expect(result.status).toBe(403)
  })

  it('ROLE-6 lets a contributor change their own name', async () => {
    const self = await freshContributor()

    const result = await t.update(self, 'users', self.user.id, { name: 'Changed name' })

    expect(result.status).toBe(200)
    expect(result.doc?.name).toBe('Changed name')
  })

  it('ROLE-6 forbids a contributor to delete a user', async () => {
    const result = await t.delete(contributor, 'users', otherContributor.user.id)

    expect(result.status).toBe(403)
  })

  it('ROLE-6 forbids a contributor to unlock a user', async () => {
    const result = await t.unlock(contributor, otherContributor.user.email)

    expect(result.status).toBe(403)
  })

  it('ROLE-6 lets an editor unlock a user', async () => {
    const result = await t.unlock(editor, otherContributor.user.email)

    expect(result.status).toBe(200)
  })

  it('ROLE-3 lets an editor open the Admin panel', async () => {
    expect(await t.canAccessAdmin(editor)).toBe(true)
  })

  it('ROLE-3 does not let a contributor open the Admin panel', async () => {
    expect(await t.canAccessAdmin(contributor)).toBe(false)
  })
})
