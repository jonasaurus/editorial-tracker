import {
  APIError,
  type Access,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type Where,
} from 'payload'

import type { ContentItem } from '@/payload-types'

import { isEditor, isEditorUser, isLoggedIn } from '../../access'
import { versionEndpoint } from '../../lib/dashboard/version'
import { isPlainDate } from '../../lib/deadline'
import { checkItemChange, type RuleId } from './rules'

/**
 * A rejected item change: 403, the message, and the rule id in `data`.
 * The name is explicit: the production build minifies class names, and
 * Payload hides the message of an error without a name or data.
 */
class ItemRuleError extends APIError<{ rule: RuleId }> {
  constructor(rule: RuleId, message: string) {
    super(message, 403, { rule })
    this.name = 'ItemRuleError'
  }
}

/**
 * True for an `ItemRuleError`. Checks the status and the rule id, not the class name.
 * Payload's own `Forbidden` has no `data`, so the two do not mix.
 */
export function isItemRuleError(error: unknown): error is APIError<{ rule: RuleId }> {
  if (!(error instanceof APIError) || error.status !== 403) return false
  const data: unknown = error.data
  return (
    typeof data === 'object' && data !== null && 'rule' in data && typeof data.rule === 'string'
  )
}

/** "Own item": the user is the creator or an author (spec §4). */
const ownItems = (userId: number): Where => ({
  or: [{ createdBy: { equals: userId } }, { authors: { equals: userId } }],
})

/** PERM-1: editors read all items, contributors only own items. */
const canRead: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isEditorUser(user)) return true
  return ownItems(user.id)
}

/** PERM-2: editors update all items, contributors only own items that are not published. */
const canUpdate: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isEditorUser(user)) return true
  return { and: [ownItems(user.id), { status: { not_equals: 'published' } }] }
}

/** The server sets these fields. A request cannot set or change them. */
const serverOnly = { create: () => false, update: () => false }

/**
 * A3: the value rules run for every save (REST, Local API, Admin panel).
 * A rejected change is not saved, and the client gets 403 with the message.
 */
const enforceValueRules: CollectionBeforeChangeHook<ContentItem> = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const result = checkItemChange({
    user: req.user ?? null,
    data,
    // On create, Payload passes an empty object, not undefined.
    originalDoc: operation === 'update' ? originalDoc : undefined,
    now: new Date().toISOString(),
  })
  if (!result.ok) throw new ItemRuleError(result.rule, result.message)
  return result.data
}

export const ContentItems: CollectionConfig = {
  slug: 'content-items',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'type', 'deadline', 'archived'],
  },
  hooks: {
    beforeChange: [enforceValueRules],
  },
  access: {
    read: canRead,
    create: isLoggedIn,
    update: canUpdate,
    // PERM-7: no delete in the app. Editors can delete in the Admin panel.
    delete: isEditor,
  },
  // LIVE-1: `GET /api/content-items/version`. Custom endpoints match before `/:id`.
  endpoints: [versionEndpoint],
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'idea',
      options: [
        { label: 'Idea', value: 'idea' },
        { label: 'Draft', value: 'draft' },
        { label: 'Review', value: 'review' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Article', value: 'article' },
        { label: 'Video', value: 'video' },
        { label: 'Podcast', value: 'podcast' },
        { label: 'Newsletter', value: 'newsletter' },
      ],
    },
    {
      name: 'authors',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
    {
      // A plain date, no time and no time zone (ADR 0007). A `text` field, because
      // the `date` field type turns values into ISO timestamps.
      name: 'deadline',
      type: 'text',
      admin: {
        description: 'Format: YYYY-MM-DD. Empty: no deadline.',
      },
      validate: (value: string | null | undefined) =>
        !value || isPlainDate(value) || 'Use a real date in the format YYYY-MM-DD.',
      hooks: {
        // An empty field means no deadline.
        beforeChange: [({ value }) => (value === '' ? null : value)],
      },
    },
    {
      name: 'archived',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      // MODEL-1
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      access: serverOnly,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      // MODEL-2
      name: 'publishedAt',
      type: 'date',
      access: serverOnly,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
