import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getDashboardData } from '@/lib/dashboard/query'
import type { DashboardParams } from '@/lib/dashboard/params'
import type { ContentItem, User } from '@/payload-types'

import { createUser } from './helpers'

let payload: Payload
let editor: User
let first: User
let second: User
let noItems: User
let onlyArchived: User

const DEFAULTS: DashboardParams = {
  view: 'board',
  type: null,
  author: null,
  archived: false,
  status: null,
  sort: 'deadline',
  dir: 'asc',
  item: null,
}

type ItemInput = Pick<ContentItem, 'title' | 'type'> &
  Partial<Pick<ContentItem, 'status' | 'archived'>> & { createdBy: User; authors: User[] }

/** Creates an item for test setup. Access control is off. */
function createItem({
  title,
  type,
  status,
  archived,
  createdBy,
  authors,
}: ItemInput): Promise<ContentItem> {
  return payload.create({
    collection: 'content-items',
    data: {
      title,
      type,
      status: status ?? 'idea',
      archived: archived ?? false,
      createdBy: createdBy.id,
      authors: authors.map((author) => author.id),
    },
  })
}

async function titles(user: User, params: Partial<DashboardParams> = {}): Promise<string[]> {
  const data = await getDashboardData(payload, user, { ...DEFAULTS, ...params })
  return data.items.map((item) => item.title).sort()
}

beforeAll(async () => {
  payload = await getPayload({ config })
  // Exact totals need a known set of items.
  await payload.delete({ collection: 'content-items', where: { id: { exists: true } } })

  editor = await createUser(payload, {
    name: 'Dash Editor',
    email: 'dash-editor@example.com',
    role: 'editor',
  })
  first = await createUser(payload, {
    name: 'Dash First',
    email: 'dash-first@example.com',
    role: 'contributor',
  })
  second = await createUser(payload, {
    name: 'Dash Second',
    email: 'dash-second@example.com',
    role: 'contributor',
  })
  noItems = await createUser(payload, {
    name: 'Dash None',
    email: 'dash-none@example.com',
    role: 'contributor',
  })
  onlyArchived = await createUser(payload, {
    name: 'Dash Archived',
    email: 'dash-archived@example.com',
    role: 'contributor',
  })

  await createItem({ title: 'A first', type: 'article', createdBy: first, authors: [first] })
  await createItem({
    title: 'B both',
    type: 'video',
    status: 'draft',
    createdBy: first,
    authors: [first, second],
  })
  // The second contributor is only the creator here (DASH-3).
  await createItem({ title: 'C by second', type: 'podcast', createdBy: second, authors: [editor] })
  await createItem({
    title: 'D published',
    type: 'newsletter',
    status: 'published',
    createdBy: editor,
    authors: [editor],
  })
  await createItem({
    title: 'E archived',
    type: 'article',
    archived: true,
    createdBy: second,
    authors: [second],
  })
  await createItem({
    title: 'F only archived',
    type: 'article',
    archived: true,
    createdBy: onlyArchived,
    authors: [onlyArchived],
  })
})

describe('getDashboardData', () => {
  it('gives an editor all active items (PERM-1, DASH-5)', async () => {
    const data = await getDashboardData(payload, editor, DEFAULTS)
    expect(data.items.map((item) => item.title).sort()).toEqual([
      'A first',
      'B both',
      'C by second',
      'D published',
    ])
    expect(data.total).toBe(4)
    expect(data.hasAnyItem).toBe(true)
  })

  it('shows archived items when Show archived is on, and the total stays active only (DASH-4, DASH-5)', async () => {
    const data = await getDashboardData(payload, editor, { ...DEFAULTS, archived: true })
    expect(data.items.map((item) => item.title).sort()).toEqual([
      'A first',
      'B both',
      'C by second',
      'D published',
      'E archived',
      'F only archived',
    ])
    expect(data.total).toBe(4)

    const filtered = await getDashboardData(payload, editor, {
      ...DEFAULTS,
      archived: true,
      type: 'article',
    })
    expect(filtered.total).toBe(4)
  })

  it('gives a contributor own items only (PERM-1)', async () => {
    expect(await titles(first)).toEqual(['A first', 'B both'])
    expect(await titles(second)).toEqual(['B both', 'C by second'])
    expect(await titles(second, { archived: true })).toEqual([
      'B both',
      'C by second',
      'E archived',
    ])
  })

  it('filters by type and counts the total without filters (DASH-2, DASH-4)', async () => {
    const data = await getDashboardData(payload, editor, { ...DEFAULTS, type: 'article' })
    expect(data.items.map((item) => item.title)).toEqual(['A first'])
    expect(data.total).toBe(4)
  })

  it('matches the Author filter on authors OR createdBy (DASH-3)', async () => {
    expect(await titles(editor, { author: second.id })).toEqual(['B both', 'C by second'])
    expect(await titles(editor, { author: second.id, archived: true })).toEqual([
      'B both',
      'C by second',
      'E archived',
    ])
    expect(await titles(editor, { author: second.id, type: 'video' })).toEqual(['B both'])
    expect(await titles(editor, { author: noItems.id })).toEqual([])
  })

  it('gives the Author filter options to editors only (DASH-2)', async () => {
    const data = await getDashboardData(payload, editor, DEFAULTS)
    const names = data.authors.map((author) => author.name)
    expect(names).toEqual(expect.arrayContaining(['Dash Editor', 'Dash First', 'Dash Second']))
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))

    const forContributor = await getDashboardData(payload, first, {
      ...DEFAULTS,
      author: second.id,
    })
    expect(forContributor.authors).toEqual([])
    expect(forContributor.params.author).toBeNull()
    expect(forContributor.items.map((item) => item.title).sort()).toEqual(['A first', 'B both'])
  })

  it('drops an unknown author id', async () => {
    const data = await getDashboardData(payload, editor, { ...DEFAULTS, author: 999_999 })
    expect(data.params.author).toBeNull()
    expect(data.items).toHaveLength(4)
  })

  it('maps users to names only, with no emails', async () => {
    const data = await getDashboardData(payload, editor, DEFAULTS)
    const both = data.items.find((item) => item.title === 'B both')
    expect(both).toMatchObject({
      type: 'video',
      status: 'draft',
      archived: false,
      authorNames: ['Dash First', 'Dash Second'],
      creatorName: 'Dash First',
    })
    expect(JSON.stringify(data)).not.toContain('@example.com')
  })

  it('tells "no items at all" apart from "only archived items" (EMPTY-1)', async () => {
    const none = await getDashboardData(payload, noItems, DEFAULTS)
    expect(none).toMatchObject({ items: [], total: 0, hasAnyItem: false })

    const archived = await getDashboardData(payload, onlyArchived, DEFAULTS)
    expect(archived).toMatchObject({ items: [], total: 0, hasAnyItem: true })
  })
})
