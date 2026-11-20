import { isPlainDate } from '@/lib/deadline'
import { isItemStatus, isItemType } from '@/lib/items'

import type { FieldErrors, ItemField, ItemInput } from './types'

export type ParsedInput = { ok: true; input: ItemInput } | { ok: false; errors: FieldErrors }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** One text per field: the Server Action checks, the form and the Payload errors use it. */
export const FIELD_MESSAGES: Record<ItemField, string> = {
  title: 'Enter a title.',
  status: 'Choose a status.',
  type: 'Choose a type.',
  deadline: 'Use a real date.',
  authors: 'Choose valid authors.',
}

/** An id is a positive safe integer. Another value cannot identify an item or a user. */
export const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

/** The deadline as a plain date or null. Undefined: the value is not valid. */
function parseDeadline(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'string' && isPlainDate(value) ? value : undefined
}

/** The author ids without duplicates, in the given order. Undefined: the value is not valid. */
function parseAuthors(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || !value.every(isId)) return undefined
  return [...new Set(value)]
}

/**
 * Checks the input of a Server Action. The value comes from the client, so every field is
 * checked. Unknown keys are dropped.
 */
export function parseItemInput(raw: unknown): ParsedInput {
  const value = isRecord(raw) ? raw : {}
  const errors: FieldErrors = {}

  const title = typeof value.title === 'string' ? value.title.trim() : ''
  if (title === '') errors.title = FIELD_MESSAGES.title

  const { status, type } = value
  if (!isItemStatus(status)) errors.status = FIELD_MESSAGES.status
  if (!isItemType(type)) errors.type = FIELD_MESSAGES.type

  const deadline = parseDeadline(value.deadline)
  if (deadline === undefined) errors.deadline = FIELD_MESSAGES.deadline

  const authors = parseAuthors(value.authors)
  if (authors === undefined) errors.authors = FIELD_MESSAGES.authors

  // The checks repeat the conditions above, so TypeScript narrows each value.
  if (
    title === '' ||
    !isItemStatus(status) ||
    !isItemType(type) ||
    deadline === undefined ||
    authors === undefined
  ) {
    return { ok: false, errors }
  }
  return { ok: true, input: { title, status, type, deadline, authors } }
}
