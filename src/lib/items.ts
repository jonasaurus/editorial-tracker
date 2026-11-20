import type { ContentItem, User } from '@/payload-types'

export type ItemStatus = ContentItem['status']
export type ItemType = ContentItem['type']
export type Role = User['role']

/**
 * A list that must hold every member of the union `T`. A missing member is a compile error,
 * so a new status, type or role in the collection cannot be forgotten here.
 */
const allOf =
  <T>() =>
  <const List extends readonly T[]>(list: [T] extends [List[number]] ? List : never) =>
    list

/** The statuses in board order (BOARD-1). The collection builds its options from this list. */
export const STATUSES = allOf<ItemStatus>()(['idea', 'draft', 'review', 'published'])

export const isItemStatus = (value: unknown): value is ItemStatus =>
  STATUSES.some((status) => status === value)

export const STATUS_LABELS: Record<ItemStatus, string> = {
  idea: 'Idea',
  draft: 'Draft',
  review: 'Review',
  published: 'Published',
}

/** The item types in menu order. */
export const TYPES = allOf<ItemType>()(['article', 'video', 'podcast', 'newsletter'])

export const isItemType = (value: unknown): value is ItemType =>
  TYPES.some((type) => type === value)

export const TYPE_LABELS: Record<ItemType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  newsletter: 'Newsletter',
}

/** A relationship value as a populated user. Null for an id (not populated) and for no value. */
export const populatedUser = (value: number | User | null | undefined): User | null =>
  typeof value === 'object' ? value : null

export const ROLES = allOf<Role>()(['editor', 'contributor'])

export const ROLE_LABELS: Record<Role, string> = {
  editor: 'Editor',
  contributor: 'Contributor',
}

/** The options of a Payload `select` field: one source for the values and the labels. */
export const toOptions = <T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): { label: string; value: T }[] => values.map((value) => ({ label: labels[value], value }))
