import config from '@payload-config'
import { REST_GET } from '@payloadcms/next/routes'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

const credentials = { email: 'rest-api@example.com', password: 'test-password' }

let payload: Payload
let token: string

/** Calls the REST route handler directly. No server runs. */
function get(path: string, authToken?: string): Promise<Response> {
  const request = new Request(`http://localhost:3000/api/${path}`, {
    headers: authToken ? { Authorization: `JWT ${authToken}` } : {},
  })
  return REST_GET(config)(request, {
    params: Promise.resolve({ slug: path.split('/') }),
  })
}

beforeAll(async () => {
  payload = await getPayload({ config })
  await payload.create({ collection: 'users', data: credentials })
  const login = await payload.login({ collection: 'users', data: credentials })
  if (!login.token) throw new Error('Login returned no token')
  token = login.token
})

describe('REST API', () => {
  it('returns 403 for GET /api/users without a token', async () => {
    const response = await get('users')

    expect(response.status).toBe(403)
  })

  it('returns the users for GET /api/users with a token', async () => {
    const response = await get('users', token)
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ docs: [{ email: credentials.email }] })
  })
})
