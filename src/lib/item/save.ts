import { Forbidden, NotFound, ValidationError, type Payload } from 'payload'

import { isItemRuleError } from '@/collections/ContentItems'
import { isItemStatus } from '@/lib/items'
import type { User } from '@/payload-types'

import { parseItemInput } from './input'
import type { FieldErrors, ItemActionResult, ItemField } from './types'

const COLLECTION = 'content-items'

/** The text when the item changed after the user opened it (for example, an editor published it). */
const STALE_MESSAGE = 'You cannot change this item now. Close it and open it again.'

/** The text when a moved item changed on the server (DND-4). */
const MOVE_STALE_MESSAGE = 'This item changed on the server.'

/** The messages for Payload field errors. The same texts as `parseItemInput`. */
const FIELD_MESSAGES: Partial<Record<ItemField, string>> = {
  title: 'Enter a title.',
  deadline: 'Use a real date.',
  authors: 'Choose valid authors.',
}

const ITEM_FIELDS: readonly ItemField[] = ['title', 'status', 'type', 'deadline', 'authors']

const isItemField = (value: string): value is ItemField =>
  ITEM_FIELDS.some((field) => field === value)

/** An item id is a positive safe integer. Another value cannot identify an item. */
const isItemId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

/**
 * True when every author id is a user. Payload does not check this: the database foreign key
 * rejects the write, and the transaction saves nothing (ADR 0012). This check runs first, so
 * the user gets a field message instead of a server error.
 */
async function authorsExist(payload: Payload, user: User, authors: number[]): Promise<boolean> {
  if (authors.length === 0) return true
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: { id: { in: authors } },
    user,
    overrideAccess: false,
  })
  return totalDocs === authors.length
}

const UNKNOWN_AUTHORS: ItemActionResult = {
  ok: false,
  reason: 'invalid',
  errors: { authors: FIELD_MESSAGES.authors },
}

/** The field errors of a Payload `ValidationError`. Null: an error is not on an item field. */
function toFieldErrors(error: ValidationError): FieldErrors | null {
  const errors: FieldErrors = {}
  for (const { path, message } of error.data.errors) {
    // A path can have a suffix, for example `authors.0`.
    const field = path.split('.')[0] ?? path
    if (!isItemField(field)) return null
    errors[field] ??= FIELD_MESSAGES[field] ?? message
  }
  return errors
}

/**
 * Maps a Payload error to a result. Errors that the user cannot fix are thrown again.
 * `Forbidden` (contributor) and `NotFound` (editor) on an update are not clear: the user lost
 * access, or the item changed. A read as the user decides (ERR-3).
 */
async function toFailure(
  payload: Payload,
  user: User,
  error: unknown,
  id: number | null,
  staleMessage = STALE_MESSAGE,
): Promise<ItemActionResult> {
  // API-2: a value rule rejected the change.
  if (isItemRuleError(error)) return { ok: false, reason: 'rejected', message: error.message }

  if (error instanceof ValidationError) {
    const errors = toFieldErrors(error)
    return errors
      ? { ok: false, reason: 'invalid', errors }
      : { ok: false, reason: 'rejected', message: error.message }
  }

  if (id !== null && (error instanceof Forbidden || error instanceof NotFound)) {
    const item = await payload.findByID({
      collection: COLLECTION,
      id,
      depth: 0,
      disableErrors: true,
      user,
      overrideAccess: false,
    })
    return item
      ? { ok: false, reason: 'rejected', message: staleMessage }
      : { ok: false, reason: 'no-access' }
  }

  throw error
}

/** Creates an item as the user (ITEM-11). The collection hook adds the creator (AUTH-1, MODEL-1). */
export async function createItemAs(
  payload: Payload,
  user: User,
  raw: unknown,
): Promise<ItemActionResult> {
  const parsed = parseItemInput(raw)
  if (!parsed.ok) return { ok: false, reason: 'invalid', errors: parsed.errors }
  if (!(await authorsExist(payload, user, parsed.input.authors))) return UNKNOWN_AUTHORS
  try {
    const doc = await payload.create({
      collection: COLLECTION,
      data: parsed.input,
      user,
      overrideAccess: false,
    })
    return { ok: true, id: doc.id }
  } catch (error) {
    return toFailure(payload, user, error, null)
  }
}

/**
 * Updates an item as the user in one update (ITEM-6). A failed rule or validation saves nothing.
 * A malformed id cannot identify an item the user can read, so it gives `no-access`.
 */
export async function updateItemAs(
  payload: Payload,
  user: User,
  id: unknown,
  raw: unknown,
): Promise<ItemActionResult> {
  if (!isItemId(id)) return { ok: false, reason: 'no-access' }
  const parsed = parseItemInput(raw)
  if (!parsed.ok) return { ok: false, reason: 'invalid', errors: parsed.errors }
  if (!(await authorsExist(payload, user, parsed.input.authors))) return UNKNOWN_AUTHORS
  try {
    const doc = await payload.update({
      collection: COLLECTION,
      id,
      data: parsed.input,
      user,
      overrideAccess: false,
    })
    return { ok: true, id: doc.id }
  } catch (error) {
    return toFailure(payload, user, error, id)
  }
}

/**
 * Archives or unarchives an item as the user (ITEM-8, ITEM-9).
 * A malformed id gives `no-access`, a value that is not a boolean gives `rejected`.
 */
export async function setArchivedAs(
  payload: Payload,
  user: User,
  id: unknown,
  archived: unknown,
): Promise<ItemActionResult> {
  if (!isItemId(id)) return { ok: false, reason: 'no-access' }
  if (typeof archived !== 'boolean') {
    return { ok: false, reason: 'rejected', message: 'The change is not valid.' }
  }
  try {
    const doc = await payload.update({
      collection: COLLECTION,
      id,
      data: { archived },
      user,
      overrideAccess: false,
    })
    return { ok: true, id: doc.id }
  } catch (error) {
    return toFailure(payload, user, error, id)
  }
}

/**
 * Moves an item to another status as the user (DND-1). Only the status changes.
 * A malformed id gives `no-access`, an unknown status gives `invalid`.
 */
export async function moveItemAs(
  payload: Payload,
  user: User,
  id: unknown,
  status: unknown,
): Promise<ItemActionResult> {
  if (!isItemId(id)) return { ok: false, reason: 'no-access' }
  if (!isItemStatus(status)) {
    return { ok: false, reason: 'invalid', errors: { status: 'Choose a status.' } }
  }
  try {
    const doc = await payload.update({
      collection: COLLECTION,
      id,
      data: { status },
      user,
      overrideAccess: false,
    })
    return { ok: true, id: doc.id }
  } catch (error) {
    return toFailure(payload, user, error, id, MOVE_STALE_MESSAGE)
  }
}
