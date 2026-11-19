import type { Payload } from 'payload'

import type { ContentItem, User } from '@/payload-types'

/** The password of every demo user (ROLE-4). */
export const DEMO_PASSWORD = 'demo-password'

/** ROLE-4: 1 editor and 2 contributors. */
export const DEMO_USERS = [
  { name: 'Mads Berg', email: 'mads@example.com', role: 'editor' },
  { name: 'Mette Holm', email: 'mette@example.com', role: 'contributor' },
  { name: 'Sara Nielsen', email: 'sara@example.com', role: 'contributor' },
] as const satisfies readonly Pick<User, 'name' | 'email' | 'role'>[]

type DemoEmail = (typeof DEMO_USERS)[number]['email']

type SeedItem = {
  title: string
  type: ContentItem['type']
  /** The final status. A contributor creates a published item as `review`, then the editor publishes it. */
  status: ContentItem['status']
  /** The creator. AUTH-1 adds the creator to `authors`. */
  creator: DemoEmail
  /** Authors in addition to the creator. */
  otherAuthors?: DemoEmail[]
  /** Days from today in Europe/Copenhagen. Null: no deadline. */
  deadlineInDays: number | null
  /** The creator archives the item after create. */
  archived?: boolean
}

const EDITOR: DemoEmail = 'mads@example.com'

const ITEMS: SeedItem[] = [
  {
    title: 'Council budget vote: what changes for schools',
    type: 'article',
    status: 'published',
    creator: 'mette@example.com',
    deadlineInDays: -2,
  },
  {
    title: 'The week in Copenhagen',
    type: 'newsletter',
    status: 'published',
    creator: 'mads@example.com',
    deadlineInDays: -1,
  },
  {
    title: 'Harbour bath water quality, explained',
    type: 'video',
    status: 'review',
    creator: 'sara@example.com',
    deadlineInDays: 0,
  },
  {
    title: 'Interview with the new transport minister',
    type: 'podcast',
    status: 'draft',
    creator: 'mette@example.com',
    otherAuthors: ['sara@example.com'],
    deadlineInDays: 3,
  },
  {
    title: 'Housing prices in Aarhus: what the data shows',
    type: 'article',
    status: 'draft',
    creator: 'sara@example.com',
    deadlineInDays: -3,
  },
  {
    title: 'Climate summit preview',
    type: 'article',
    status: 'idea',
    creator: 'mads@example.com',
    deadlineInDays: null,
  },
  {
    title: 'Behind the scenes on election night',
    type: 'video',
    status: 'idea',
    creator: 'mette@example.com',
    deadlineInDays: 10,
  },
  {
    title: 'Morning briefing: new format',
    type: 'newsletter',
    status: 'review',
    creator: 'mads@example.com',
    deadlineInDays: 1,
  },
  {
    title: 'Summer festival guide',
    type: 'article',
    status: 'draft',
    creator: 'sara@example.com',
    deadlineInDays: -20,
    archived: true,
  },
  {
    title: 'Local football: the season so far',
    type: 'podcast',
    status: 'idea',
    creator: 'sara@example.com',
    deadlineInDays: null,
  },
]

/** DL-1: today as `YYYY-MM-DD` in Europe/Copenhagen. The `en-CA` locale gives this format. */
const todayInCopenhagen = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen' }).format(new Date())

/** Adds days to a plain date. UTC math, so daylight saving time has no effect. */
function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Seeds the demo users and items (ROLE-4) when the database has no users.
 * Each item is created and changed as a demo user, so the app rules apply.
 */
export async function seed(payload: Payload): Promise<void> {
  const { totalDocs } = await payload.count({ collection: 'users' })
  if (totalDocs > 0) {
    payload.logger.info('Seed: the database has users. Seed skipped.')
    return
  }

  // No user, so access control is off and the role field accepts every role.
  const users = new Map<DemoEmail, User>()
  for (const demoUser of DEMO_USERS) {
    const user = await payload.create({
      collection: 'users',
      data: { ...demoUser, password: DEMO_PASSWORD },
    })
    users.set(demoUser.email, user)
  }
  const userFor = (email: DemoEmail): User => {
    const user = users.get(email)
    if (!user) throw new Error(`Seed: no demo user ${email}`)
    return user
  }
  const editor = userFor(EDITOR)
  const today = todayInCopenhagen()

  for (const item of ITEMS) {
    const creator = userFor(item.creator)
    // PERM-3: only an editor publishes.
    const mustPublish = item.status === 'published' && creator.role !== 'editor'

    const created = await payload.create({
      collection: 'content-items',
      data: {
        title: item.title,
        type: item.type,
        status: mustPublish ? 'review' : item.status,
        authors: [creator.id, ...(item.otherAuthors ?? []).map((email) => userFor(email).id)],
        deadline: item.deadlineInDays === null ? null : addDays(today, item.deadlineInDays),
      },
      user: creator,
      overrideAccess: false,
    })

    if (mustPublish) {
      await payload.update({
        collection: 'content-items',
        id: created.id,
        data: { status: 'published' },
        user: editor,
        overrideAccess: false,
      })
    }

    if (item.archived) {
      await payload.update({
        collection: 'content-items',
        id: created.id,
        data: { archived: true },
        user: creator,
        overrideAccess: false,
      })
    }
  }

  payload.logger.info(`Seed: created ${DEMO_USERS.length} users and ${ITEMS.length} items.`)
}
