import type { ItemStatus, ItemType, Role } from '@/lib/items'

/** A user in the author picker. No email goes to the page. */
export type UserOption = { id: number; name: string; role: Role }

/** One part of a text line (kicker, metadata). `strong`: shown in ink. */
export type TextPart = { text: string; strong: boolean }

/** The view data of one item in the dialog (ITEM-3). */
export type ItemDetail = {
  id: number
  title: string
  status: ItemStatus
  type: ItemType
  /** A plain date `YYYY-MM-DD`, or null (ADR 0007). */
  deadline: string | null
  archived: boolean
  /** The authors in the stored order. */
  authors: { id: number; name: string }[]
  creatorName: string | null
  /** ISO timestamps. */
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

/** What the item dialog shows (ITEM-1, ITEM-11, ITEM-12). */
export type ItemDialogState =
  | { kind: 'new'; users: UserOption[] }
  | { kind: 'edit'; item: ItemDetail; users: UserOption[] }
  | { kind: 'not-found' }

/** The fields that a user sends on create and update (ITEM-3). */
export type ItemInput = {
  title: string
  status: ItemStatus
  type: ItemType
  deadline: string | null
  /** User ids, in order. */
  authors: number[]
}

export type ItemField = keyof ItemInput

/** One message per field. */
export type FieldErrors = Partial<Record<ItemField, string>>

/** The result of a Server Action on an item. Unknown server errors are thrown. */
export type ItemActionResult =
  | { ok: true; id: number }
  /** ERR-5: no valid session. The client opens the login page. */
  | { ok: false; reason: 'session-expired' }
  /** ERR-3: the user can no longer read the item. */
  | { ok: false; reason: 'no-access' }
  | { ok: false; reason: 'invalid'; errors: FieldErrors }
  /** A value rule rejected the change (API-2), or the item changed meanwhile. */
  | { ok: false; reason: 'rejected'; message: string }
