import type { ContentItem, User } from '@/payload-types'

export type ItemStatus = ContentItem['status']
export type ItemType = ContentItem['type']
export type Role = User['role']

/** The statuses in board order (BOARD-1). */
export const STATUSES = [
  'idea',
  'draft',
  'review',
  'published',
] as const satisfies readonly ItemStatus[]

export const STATUS_LABELS: Record<ItemStatus, string> = {
  idea: 'Idea',
  draft: 'Draft',
  review: 'Review',
  published: 'Published',
}

/** The item types in menu order. */
export const TYPES = [
  'article',
  'video',
  'podcast',
  'newsletter',
] as const satisfies readonly ItemType[]

export const TYPE_LABELS: Record<ItemType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  newsletter: 'Newsletter',
}

export const ROLE_LABELS: Record<Role, string> = {
  editor: 'Editor',
  contributor: 'Contributor',
}
