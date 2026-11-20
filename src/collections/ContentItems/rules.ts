import type { ContentItem, User } from '@/payload-types'

type Relation = number | User | null | undefined

/** The id of a relationship value. Payload gives an id or a populated user. */
const toId = (value: Relation): number | null =>
  value === null || value === undefined ? null : typeof value === 'number' ? value : value.id

export const authorIds = (authors: ContentItem['authors']): number[] =>
  (authors ?? []).flatMap((author) => {
    const id = toId(author)
    return id === null ? [] : [id]
  })

/** True when both lists hold the same ids, in any order. */
export const sameIds = (a: number[], b: number[]): boolean => {
  const setA = new Set(a)
  const setB = new Set(b)
  return setA.size === setB.size && [...setA].every((id) => setB.has(id))
}

/** True when a field that a user edits has a new value. PERM-6 uses this. */
function editedFieldsChanged(original: ContentItem, next: Partial<ContentItem>): boolean {
  return (
    next.title !== original.title ||
    next.status !== original.status ||
    next.type !== original.type ||
    (next.deadline ?? null) !== (original.deadline ?? null) ||
    !sameIds(authorIds(next.authors), authorIds(original.authors))
  )
}

export const RULE_IDS = ['PERM-2', 'PERM-3', 'PERM-6', 'AUTH-2'] as const
export type RuleId = (typeof RULE_IDS)[number]

export type RuleResult =
  { ok: true; data: Partial<ContentItem> } | { ok: false; rule: RuleId; message: string }

type ChangeInput = {
  /** The logged-in user. Null for system calls (seed). */
  user: Pick<User, 'id' | 'role'> | null
  /** The item after the change. Payload fills the fields that the request did not send. */
  data: Partial<ContentItem>
  /** The item before the change. Undefined on create. */
  originalDoc: ContentItem | undefined
  /** The current time as an ISO string. */
  now: string
}

const fail = (rule: RuleId, message: string): RuleResult => ({ ok: false, rule, message })

/**
 * The value rules for an item change (spec API-2, ADR 0003).
 * Access decides which items a user can change. This function decides which values.
 */
export function checkItemChange({
  user,
  data,
  originalDoc: original,
  now,
}: ChangeInput): RuleResult {
  const next: Partial<ContentItem> = { ...data }

  // MODEL-1: the creator is the logged-in user, and it never changes.
  next.createdBy = original ? toId(original.createdBy) : (user?.id ?? toId(data.createdBy))

  // MODEL-2: set each time the status changes to published. Kept after unpublish.
  const becomesPublished = next.status === 'published' && original?.status !== 'published'
  next.publishedAt = becomesPublished ? now : (original?.publishedAt ?? null)

  // System calls (seed) have no user. Access blocks app calls without a user.
  if (!user) return { ok: true, data: next }

  const isEditor = user.role === 'editor'

  if (!original) {
    // AUTH-1: a new item starts with the current user in authors.
    const ids = authorIds(next.authors)
    if (!ids.includes(user.id)) next.authors = [...ids, user.id]

    if (!isEditor && next.status === 'published') {
      return fail('PERM-3', 'Only editors can publish items.')
    }
    return { ok: true, data: next }
  }

  // PERM-6: an archived item is read-only. Only unarchive is allowed, alone.
  if (original.archived && editedFieldsChanged(original, next)) {
    return fail('PERM-6', 'This item is archived. Unarchive it before you change it.')
  }

  // AUTH-3, PERM-4: an editor can set any status and change authors freely.
  if (isEditor) return { ok: true, data: next }

  // PERM-2, PERM-5: access already blocks this. A second check for safety.
  if (original.status === 'published') {
    return fail('PERM-2', 'Only editors can change a published item.')
  }

  // PERM-3, PERM-4: contributors move items between idea, draft and review only.
  if (next.status === 'published') {
    return fail('PERM-3', 'Only editors can publish items.')
  }

  // AUTH-2: a contributor cannot remove themselves from authors.
  const wasAuthor = authorIds(original.authors).includes(user.id)
  if (wasAuthor && !authorIds(next.authors).includes(user.id)) {
    return fail('AUTH-2', 'You cannot remove yourself from the authors. Ask an editor to do it.')
  }

  return { ok: true, data: next }
}
