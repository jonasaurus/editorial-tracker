import config from '@payload-config'
import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { TEST_PASSWORD } from './helpers'

// This file has its own database, so the users table is empty at the start.

let payload: Payload

/** Creates a user without a role, as the Admin panel "create first user" form can. */
function createWithoutRole(email: string) {
  return payload.create({
    collection: 'users',
    // The generated type requires `role`. This test checks the default value.
    data: {
      name: email,
      email,
      password: TEST_PASSWORD,
    } as RequiredDataFromCollectionSlug<'users'>,
  })
}

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('Users: default role', () => {
  it('gives the editor role to the first user and the contributor role to the next user', async () => {
    const first = await createWithoutRole('first@example.com')
    const second = await createWithoutRole('second@example.com')

    expect(first.role).toBe('editor')
    expect(second.role).toBe('contributor')
  })
})
