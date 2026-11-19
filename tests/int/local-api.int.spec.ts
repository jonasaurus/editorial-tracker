import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

let payload: Payload
let user: User

beforeAll(async () => {
  payload = await getPayload({ config })
  // Test setup only: the Local API skips access control by default.
  user = await payload.create({
    collection: 'users',
    data: { email: 'local-api@example.com', password: 'test-password' },
  })
})

describe('Local API', () => {
  it('reads users as a logged-in user with access control on', async () => {
    const result = await payload.find({
      collection: 'users',
      user,
      overrideAccess: false,
    })

    expect(result.docs.map((doc) => doc.email)).toContain(user.email)
  })

  it('rejects a read without a user when access control is on', async () => {
    await expect(
      payload.find({ collection: 'users', overrideAccess: false }),
    ).rejects.toMatchObject({ status: 403 })
  })
})
