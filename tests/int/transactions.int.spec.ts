import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { createActor, transports, type Actor } from './helpers'

let payload: Payload
let editor: Actor

/** A user id that does not exist. The database foreign key rejects it. */
const UNKNOWN_USER = 999_999

/**
 * True when the write failed. The Local API throws the database error (the helper rethrows
 * errors without an HTTP status); the REST API returns an error status.
 */
async function failed(write: Promise<{ status: number }>): Promise<boolean> {
  try {
    return (await write).status >= 400
  } catch {
    return true
  }
}

beforeAll(async () => {
  payload = await getPayload({ config })
  editor = await createActor(payload, {
    name: 'Tx Editor',
    email: 'tx-editor@example.com',
    role: 'editor',
  })
})

// ADR 0012: one transaction per operation. A failed write saves nothing.
describe.each(transports)('transactions ($name)', (transport) => {
  it('ADR 0012: a create with an unknown author saves no item', async () => {
    const before = (await payload.count({ collection: 'content-items' })).totalDocs
    const write = transport.create(editor, 'content-items', {
      title: `Unknown author ${transport.name}`,
      type: 'article',
      authors: [UNKNOWN_USER],
    })
    expect(await failed(write)).toBe(true)
    expect((await payload.count({ collection: 'content-items' })).totalDocs).toBe(before)
  })

  it('ADR 0012, ITEM-6: an update with an unknown author changes no field', async () => {
    const item = await payload.create({
      collection: 'content-items',
      data: { title: 'Old title', type: 'article', status: 'idea', authors: [editor.user.id] },
    })
    const write = transport.update(editor, 'content-items', item.id, {
      title: 'New title',
      authors: [UNKNOWN_USER],
    })
    expect(await failed(write)).toBe(true)
    const saved = await payload.findByID({ collection: 'content-items', id: item.id, depth: 0 })
    expect(saved.title).toBe('Old title')
    expect(saved.authors).toEqual([editor.user.id])
  })
})
