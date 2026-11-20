import type { Access, CollectionConfig } from 'payload'

import { isEditor, isEditorField, isEditorUser, isLoggedIn } from '@/access'
import { ROLE_LABELS, ROLES, toOptions } from '@/lib/items'

/** Editors change every user. Other users change only their own account. */
const isEditorOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isEditorUser(user)) return true
  return { id: { equals: user.id } }
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
  },
  auth: {
    // 8 hours: one work day. Payload does not refresh the token on the server.
    tokenExpiration: 8 * 60 * 60,
    // LOGIN-4: Payload's defaults, set here so that the rule is visible.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: {
      // Off by default: Docker serves the app over plain http (see README).
      secure: process.env.COOKIE_SECURE === 'true',
    },
  },
  access: {
    // ROLE-3: only editors open the Admin panel.
    admin: ({ req }) => isEditorUser(req.user),
    create: isEditor,
    // Every logged-in user reads all users: the author picker lists them.
    read: isLoggedIn,
    update: isEditorOrSelf,
    delete: isEditor,
    // The default lets any logged-in user unlock any account.
    unlock: isEditor,
  },
  fields: [
    // Email added by default
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: toOptions(ROLES, ROLE_LABELS),
      // The first user is an editor: the Admin panel "create first user" form skips field access.
      defaultValue: async ({ req }) => {
        const { totalDocs } = await req.payload.count({ collection: 'users', req })
        return totalDocs === 0 ? 'editor' : 'contributor'
      },
      // ROLE-2: only editors set or change a role. For other users, Payload drops the value.
      access: {
        create: isEditorField,
        update: isEditorField,
      },
    },
  ],
}
