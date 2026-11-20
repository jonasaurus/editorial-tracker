import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldHook,
  Where,
} from 'payload'

import { isEditor, isEditorUser, isLoggedIn } from '@/access'
import { versionEndpoint } from '@/lib/dashboard/version'
import { isPlainDate } from '@/lib/deadline'
import { STATUS_LABELS, STATUSES, toOptions, TYPE_LABELS, TYPES } from '@/lib/items'
import type { ContentItem } from '@/payload-types'

import { ItemRuleError } from './errors'
import { checkItemChange } from './rules'

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

/** MODEL-1, MODEL-2: the server sets these fields. A request cannot set or change them. */
const serverOnly = { create: () => false, update: () => false }

/**
 * API-2: the value rules run for every save (REST, Local API, Admin panel).
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

/** An empty field means no deadline (ADR 0007). */
const emptyToNull: FieldHook<ContentItem, ContentItem['deadline']> = ({ value }) =>
  value === '' ? null : value

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
      options: toOptions(STATUSES, STATUS_LABELS),
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: toOptions(TYPES, TYPE_LABELS),
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
        beforeChange: [emptyToNull],
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
