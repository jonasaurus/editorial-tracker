import { type ItemStatus, type ItemType, type Role, STATUS_LABELS, TYPE_LABELS } from '@/lib/items'

import { FIELD_MESSAGES } from './input'
import type { FieldErrors, ItemDetail, ItemInput, TextPart } from './types'

/** The values of the item form. */
export type ItemFormValues = {
  title: string
  status: ItemStatus
  type: ItemType
  deadline: string | null
  /** In the shown order. */
  authorIds: number[]
}

/** The first values: the saved item, or a new item (ITEM-11, AUTH-1). */
export function initialValues(item: ItemDetail | null, userId: number): ItemFormValues {
  if (!item) {
    return { title: '', status: 'idea', type: 'article', deadline: null, authorIds: [userId] }
  }
  return {
    title: item.title,
    status: item.status,
    type: item.type,
    deadline: item.deadline,
    authorIds: item.authors.map((author) => author.id),
  }
}

/** True when both lists hold the same ids in the same order. */
function sameOrderedIds(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

/**
 * True when the form has unsaved edits (ITEM-9, ITEM-10). The title is compared trimmed.
 * The author order is shown, so a new order is an edit.
 */
export function isDirty(initial: ItemFormValues, current: ItemFormValues): boolean {
  return (
    initial.title.trim() !== current.title.trim() ||
    initial.status !== current.status ||
    initial.type !== current.type ||
    initial.deadline !== current.deadline ||
    !sameOrderedIds(initial.authorIds, current.authorIds)
  )
}

/** Client-side checks before a save. Empty object: no errors. */
export function validateValues(values: ItemFormValues): FieldErrors {
  return values.title.trim() === '' ? { title: FIELD_MESSAGES.title } : {}
}

/** The values as the input of a Server Action. */
export function toItemInput(values: ItemFormValues): ItemInput {
  return {
    title: values.title.trim(),
    status: values.status,
    type: values.type,
    deadline: values.deadline,
    authors: [...values.authorIds],
  }
}

/** ITEM-5: the footer button is "Publish" (armed). */
export function isArmed(input: {
  isNew: boolean
  savedStatus: ItemStatus | null
  selected: ItemStatus
  role: Role
}): boolean {
  return (
    input.role === 'editor' &&
    !input.isNew &&
    input.selected === 'published' &&
    input.savedStatus !== 'published'
  )
}

const DOT: TextPart = { text: ' · ', strong: false }
const ARROW: TextPart = { text: ' → ', strong: false }

/**
 * The kicker line (design-system §6 "Kicker"). `item` null: a new item.
 * Each separator (" · ", " → ") is a part of its own, not strong.
 * - New: "New item".
 * - Edit: "Article · **Review**", and "… → **Published**" when the selected status is another.
 * - Archived: "Article · Review · **Archived**". The fields are read-only, so the status
 *   does not change. Only "Archived" is strong.
 */
export function getKicker(item: ItemDetail | null, selected: ItemStatus): TextPart[] {
  if (!item) return [{ text: 'New item', strong: false }]
  const type: TextPart = { text: TYPE_LABELS[item.type], strong: false }
  const saved = STATUS_LABELS[item.status]
  if (item.archived) {
    return [type, DOT, { text: saved, strong: false }, DOT, { text: 'Archived', strong: true }]
  }
  const parts = [type, DOT, { text: saved, strong: true }]
  if (selected === item.status) return parts
  return [...parts, ARROW, { text: STATUS_LABELS[selected], strong: true }]
}
