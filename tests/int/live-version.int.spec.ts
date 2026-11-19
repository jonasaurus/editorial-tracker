import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { revokeSession } from '@/lib/auth/authenticate'
import { getDashboardVersion } from '@/lib/dashboard/version'
import { todayInCopenhagen } from '@/lib/deadline'
import type { ContentItem, User } from '@/payload-types'

import { type Actor, createActor, rest } from './helpers'

let payload: Payload
let editor: Actor
let contributor: Actor
let other: Actor

/** Creates an item for test setup. Access control is off. */
function seedItem(createdBy: User, change: Partial<ContentItem> = {}): Promise<ContentItem> {
  return payload.create({
    collection: 'content-items',
    data: {
      title: 'Live',
      type: 'article',
      status: 'idea',
      ...change,
      createdBy: createdBy.id,
      authors: [createdBy.id],
    },
  })
}

/** `updatedAt` has millisecond resolution. A short wait makes sure two writes do not share it. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 5))

/** Splits a version into its parts: today, count, latest updatedAt. */
function parts(version: string): { today: string; count: number; latest: string } {
  const match = /^(\d{4}-\d{2}-\d{2}):(\d+):(.+)$/.exec(version)
  if (!match?.[1] || !match[2] || !match[3]) throw new Error(`Not a version: ${version}`)
  return { today: match[1], count: Number(match[2]), latest: match[3] }
}

/** Counts the items a user can read, as the user. */
async function readableCount(user: User): Promise<number> {
  const result = await payload.count({
    collection: 'content-items',
    user,
    overrideAccess: false,
  })
  return result.totalDocs
}

beforeAll(async () => {
  payload = await getPayload({ config })
  editor = await createActor(payload, {
    name: 'Live Editor',
    email: 'live-editor@example.com',
    role: 'editor',
  })
  contributor = await createActor(payload, {
    name: 'Live Contributor',
    email: 'live-contributor@example.com',
    role: 'contributor',
  })
  other = await createActor(payload, {
    name: 'Live Other',
    email: 'live-other@example.com',
    role: 'contributor',
  })
})

describe('getDashboardVersion (Local API)', () => {
  it('LIVE-1, DL-1: has the form <today>:<count>:<latest updatedAt>', async () => {
    await seedItem(contributor.user)
    await tick()
    const latest = await seedItem(other.user, { archived: true })
    const version = await getDashboardVersion(payload, editor.user)
    expect(version).toBe(
      `${todayInCopenhagen()}:${await readableCount(editor.user)}:${latest.updatedAt}`,
    )
  })

  it('LIVE-1: counts archived items too', async () => {
    const before = parts(await getDashboardVersion(payload, editor.user))
    await tick()
    await seedItem(contributor.user, { archived: true })
    const after = parts(await getDashboardVersion(payload, editor.user))
    expect(after.count).toBe(before.count + 1)
  })

  it('LIVE-1, PERM-1: a contributor count includes only own items', async () => {
    const version = parts(await getDashboardVersion(payload, contributor.user))
    const all = await payload.count({ collection: 'content-items' })
    expect(version.count).toBe(await readableCount(contributor.user))
    expect(version.count).toBeLessThan(all.totalDocs)
  })

  it('LIVE-1: a user without items gets "-" as the latest', async () => {
    const empty = await createActor(payload, {
      name: 'Live Empty',
      email: 'live-empty@example.com',
      role: 'contributor',
    })
    expect(await getDashboardVersion(payload, empty.user)).toBe(`${todayInCopenhagen()}:0:-`)
  })

  it('LIVE-1: the version changes after a create, an update, an archive and a delete', async () => {
    const versions = [await getDashboardVersion(payload, editor.user)]

    await tick()
    const item = await payload.create({
      collection: 'content-items',
      data: { title: 'Live create', type: 'article', status: 'idea' },
      user: contributor.user,
      overrideAccess: false,
    })
    versions.push(await getDashboardVersion(payload, editor.user))

    await tick()
    await payload.update({
      collection: 'content-items',
      id: item.id,
      data: { title: 'Live update' },
      user: contributor.user,
      overrideAccess: false,
    })
    versions.push(await getDashboardVersion(payload, editor.user))

    await tick()
    await payload.update({
      collection: 'content-items',
      id: item.id,
      data: { archived: true },
      user: editor.user,
      overrideAccess: false,
    })
    versions.push(await getDashboardVersion(payload, editor.user))

    await tick()
    await payload.delete({
      collection: 'content-items',
      id: item.id,
      user: editor.user,
      overrideAccess: false,
    })
    versions.push(await getDashboardVersion(payload, editor.user))

    // Each write changes the version. After the delete, the version can be equal to the first
    // one again (same items as before the create). The page shows that same state, so that is OK.
    for (let index = 1; index < versions.length; index++) {
      expect(versions[index]).not.toBe(versions[index - 1])
    }
  })

  it('LIVE-1: the contributor version changes after a change to an own item', async () => {
    const item = await seedItem(contributor.user)
    const before = await getDashboardVersion(payload, contributor.user)
    await tick()
    await payload.update({
      collection: 'content-items',
      id: item.id,
      data: { status: 'review' },
      user: editor.user,
      overrideAccess: false,
    })
    expect(await getDashboardVersion(payload, contributor.user)).not.toBe(before)
  })

  it('PERM-1: the contributor version does not change when an editor changes an item of another user', async () => {
    const item = await seedItem(other.user)
    const before = await getDashboardVersion(payload, contributor.user)

    await tick()
    await payload.update({
      collection: 'content-items',
      id: item.id,
      data: { title: 'Changed by the editor' },
      user: editor.user,
      overrideAccess: false,
    })
    await tick()
    await payload.create({
      collection: 'content-items',
      data: { title: 'Editor own item', type: 'article', status: 'idea' },
      user: editor.user,
      overrideAccess: false,
    })
    await tick()
    await payload.delete({
      collection: 'content-items',
      id: item.id,
      user: editor.user,
      overrideAccess: false,
    })

    expect(await getDashboardVersion(payload, contributor.user)).toBe(before)
  })
})

describe('GET /api/content-items/version (REST)', () => {
  const path = ['content-items', 'version']

  it('LIVE-1: returns 200 { version } with a JWT, never cached', async () => {
    const response = await rest('GET', editor, path)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ version: await getDashboardVersion(payload, editor.user) })
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('LIVE-1, PERM-1: returns the version of the contributor for a contributor', async () => {
    const response = await rest('GET', contributor, path)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      version: await getDashboardVersion(payload, contributor.user),
    })
  })

  it('LIVE-1: accepts the payload-token cookie', async () => {
    const response = await rest('GET', null, path, {
      headers: { Cookie: `payload-token=${contributor.token}` },
    })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      version: await getDashboardVersion(payload, contributor.user),
    })
  })

  it('ERR-5: returns 401 without a session, never cached', async () => {
    const response = await rest('GET', null, path)
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ message: 'Not logged in.' })
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('ERR-5: returns 401 for a token after logout', async () => {
    const user = await createActor(payload, {
      name: 'Live Logout',
      email: 'live-logout@example.com',
      role: 'contributor',
    })
    expect((await rest('GET', user, path)).status).toBe(200)
    await revokeSession(payload, new Headers({ Authorization: `JWT ${user.token}` }))
    expect((await rest('GET', user, path)).status).toBe(401)
  })

  it('does not hide GET /api/content-items/<id>', async () => {
    const item = await seedItem(editor.user)
    const response = await rest('GET', editor, ['content-items', String(item.id)])
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: item.id, title: item.title })
  })
})
