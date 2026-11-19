import { isPlainDate } from '@/lib/deadline'
import { STATUSES, TYPES, type ItemStatus, type ItemType } from '@/lib/items'

import type { FieldErrors, ItemInput } from './types'

export type ParsedInput = { ok: true; input: ItemInput } | { ok: false; errors: FieldErrors }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStatus = (value: unknown): value is ItemStatus =>
  STATUSES.some((status) => status === value)

const isType = (value: unknown): value is ItemType => TYPES.some((type) => type === value)

const isId = (value: unknown): value is number =>
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
  if (title === '') errors.title = 'Enter a title.'

  const { status, type } = value
  if (!isStatus(status)) errors.status = 'Choose a status.'
  if (!isType(type)) errors.type = 'Choose a type.'

  const deadline = parseDeadline(value.deadline)
  if (deadline === undefined) errors.deadline = 'Use a real date.'

  const authors = parseAuthors(value.authors)
  if (authors === undefined) errors.authors = 'Choose valid authors.'

  // The checks repeat the conditions above, so TypeScript narrows each value.
  if (
    title === '' ||
    !isStatus(status) ||
    !isType(type) ||
    deadline === undefined ||
    authors === undefined
  ) {
    return { ok: false, errors }
  }
  return { ok: true, input: { title, status, type, deadline, authors } }
}
