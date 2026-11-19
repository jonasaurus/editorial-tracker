import type { Access, FieldAccess, PayloadRequest } from 'payload'

/** True when the user has the editor role (ROLE-1). */
export const isEditorUser = (user: PayloadRequest['user']): boolean => user?.role === 'editor'

export const isEditor: Access = ({ req }) => isEditorUser(req.user)

export const isLoggedIn: Access = ({ req }) => Boolean(req.user)

export const isEditorField: FieldAccess = ({ req }) => isEditorUser(req.user)
