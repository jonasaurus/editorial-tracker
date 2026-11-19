import config from '@payload-config'
import { REST_DELETE, REST_GET, REST_PATCH, REST_POST } from '@payloadcms/next/routes'
import {
  createLocalReq,
  getAccessResults,
  getPayload,
  type CollectionSlug,
  type DataFromCollectionSlug,
  type Payload,
  type RequiredDataFromCollectionSlug,
  type TypedCollectionSelect,
  type Where,
} from 'payload'

import type { User } from '@/payload-types'

/** The password of every test user. */
export const TEST_PASSWORD = 'test-password'

/** A logged-in user. The Local API uses `user`, the REST API uses `token`. */
export type Actor = { user: User; token: string }

/**
 * The result of one operation, the same for each transport.
 * `doc` is set for a single document, `docs` for a list. `message` is set for an error.
 */
export type Result<T> = { status: number; doc?: T; docs?: T[]; message?: string }

/** One interface over the Local API and the REST API, so a rule test runs on both. */
export interface Transport {
  name: 'local' | 'rest'
  find<S extends CollectionSlug>(
    actor: Actor | null,
    collection: S,
    where?: Where,
  ): Promise<Result<DataFromCollectionSlug<S>>>
  findByID<S extends CollectionSlug>(
    actor: Actor | null,
    collection: S,
    id: number,
  ): Promise<Result<DataFromCollectionSlug<S>>>
  create<S extends CollectionSlug>(
    actor: Actor | null,
    collection: S,
    data: Record<string, unknown>,
  ): Promise<Result<DataFromCollectionSlug<S>>>
  update<S extends CollectionSlug>(
    actor: Actor | null,
    collection: S,
    id: number,
    data: Record<string, unknown>,
  ): Promise<Result<DataFromCollectionSlug<S>>>
  delete<S extends CollectionSlug>(
    actor: Actor | null,
    collection: S,
    id: number,
  ): Promise<Result<DataFromCollectionSlug<S>>>
  /** Unlocks the user with this email. */
  unlock(actor: Actor | null, email: string): Promise<Result<never>>
  /** ROLE-3: the `canAccessAdmin` permission of the actor. */
  canAccessAdmin(actor: Actor): Promise<boolean>
}

type UserInput = { name: string; email: string; role: User['role'] }

/** Creates a user for test setup. Access control is off. */
export async function createUser(payload: Payload, input: UserInput): Promise<User> {
  return payload.create({
    collection: 'users',
    data: { ...input, password: TEST_PASSWORD },
  })
}

/** Logs in a user and returns the JWT. */
export async function login(payload: Payload, email: string): Promise<string> {
  const result = await payload.login({
    collection: 'users',
    data: { email, password: TEST_PASSWORD },
  })
  if (!result.token) throw new Error(`Login returned no token for ${email}`)
  return result.token
}

/** Creates a user and logs in. */
export async function createActor(payload: Payload, input: UserInput): Promise<Actor> {
  const user = await createUser(payload, input)
  return { user, token: await login(payload, input.email) }
}

/** Payload errors carry an HTTP status. Other errors are bugs, so the caller throws them. */
function toErrorResult(error: unknown): Result<never> {
  if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
    return { status: error.status, message: error.message }
  }
  throw error
}

const user = (actor: Actor | null) => actor?.user

/**
 * Runs a Local API call and maps a Payload error to a `Result`.
 * `getPayload` returns the cached instance of the test file.
 */
async function local<T>(operation: (payload: Payload) => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await operation(await getPayload({ config }))
  } catch (error) {
    return toErrorResult(error)
  }
}

/** Local API with access control on. Create returns 201, like the REST API. */
export const localTransport: Transport = {
  name: 'local',
  async find(actor, collection, where) {
    return local(async (payload) => {
      const result = await payload.find({
        collection,
        where,
        user: user(actor),
        overrideAccess: false,
      })
      return { status: 200, docs: result.docs }
    })
  },
  async findByID(actor, collection, id) {
    return local(async (payload) => {
      const doc = await payload.findByID({
        collection,
        id,
        user: user(actor),
        overrideAccess: false,
      })
      return { status: 200, doc }
    })
  },
  async create<S extends CollectionSlug>(
    actor: Actor | null,
    collection: S,
    data: Record<string, unknown>,
  ) {
    return local(async (payload) => {
      const doc = await payload.create({
        collection,
        // The input is not typed, so tests can send values that the server must reject.
        data: data as RequiredDataFromCollectionSlug<S>,
        user: user(actor),
        overrideAccess: false,
      })
      return { status: 201, doc }
    })
  },
  async update<S extends CollectionSlug>(
    actor: Actor | null,
    collection: S,
    id: number,
    data: Record<string, unknown>,
  ) {
    return local(async (payload) => {
      // The update-by-ID overload. Its data type uses a type that Payload does not export.
      type UpdateData = Parameters<typeof payload.update<S, TypedCollectionSelect[S]>>[0]['data']
      const doc = await payload.update({
        collection,
        id,
        data: data as UpdateData,
        user: user(actor),
        overrideAccess: false,
      })
      return { status: 200, doc }
    })
  },
  async delete(actor, collection, id) {
    return local(async (payload) => {
      const doc = await payload.delete({
        collection,
        id,
        user: user(actor),
        overrideAccess: false,
      })
      return { status: 200, doc }
    })
  },
  async unlock(actor, email) {
    return local(async (payload) => {
      await payload.unlock({
        collection: 'users',
        // The generated `unlock` type also asks for a password. Payload reads only the email.
        data: { email, password: TEST_PASSWORD },
        overrideAccess: false,
        req: { user: user(actor) },
      })
      return { status: 200 }
    })
  },
  async canAccessAdmin(actor) {
    const payload = await getPayload({ config })
    const req = await createLocalReq({ user: { ...actor.user, collection: 'users' } }, payload)
    const permissions = await getAccessResults({ req })
    return permissions.canAccessAdmin === true
  },
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Encodes a value in the bracket syntax of `qs`, for example `where[role][equals]=editor`. */
function toQueryParts(prefix: string, value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => toQueryParts(`${prefix}[${index}]`, item))
  }
  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) => toQueryParts(`${prefix}[${key}]`, item))
  }
  if (value === undefined) return []
  return [`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`]
}

const restHandlers = {
  GET: REST_GET,
  POST: REST_POST,
  PATCH: REST_PATCH,
  DELETE: REST_DELETE,
}

/** Calls a REST route handler directly. No server runs. */
async function rest(
  method: keyof typeof restHandlers,
  actor: Actor | null,
  path: string[],
  options: { body?: unknown; query?: string } = {},
): Promise<{ status: number; body: unknown }> {
  const headers = new Headers()
  if (actor) headers.set('Authorization', `JWT ${actor.token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  const query = options.query ? `?${options.query}` : ''
  const request = new Request(`http://localhost:3000/api/${path.join('/')}${query}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const response = await restHandlers[method](config)(request, {
    params: Promise.resolve({ slug: path }),
  })
  return { status: response.status, body: await response.json() }
}

/** Reads `{ errors: [{ message }] }` from a REST error body. */
function errorMessage(body: unknown): string | undefined {
  if (!isRecord(body) || !Array.isArray(body.errors)) return undefined
  const first: unknown = body.errors[0]
  return isRecord(first) && typeof first.message === 'string' ? first.message : undefined
}

/**
 * Maps a REST response to a `Result`. The REST API returns JSON that the
 * server builds from the collection types, so the document type is asserted here.
 */
function toResult<T>(
  response: { status: number; body: unknown },
  shape: 'doc' | 'wrapped' | 'list' | 'none',
): Result<T> {
  const { status, body } = response
  if (status >= 400) return { status, message: errorMessage(body) }
  if (!isRecord(body)) return { status }
  switch (shape) {
    case 'doc':
      return { status, doc: body as T }
    case 'wrapped':
      return { status, doc: body.doc as T }
    case 'list':
      return { status, docs: body.docs as T[] }
    case 'none':
      return { status }
  }
}

/** REST API through the route handlers, with a JWT in the Authorization header. */
export const restTransport: Transport = {
  name: 'rest',
  async find(actor, collection, where) {
    const query = where ? toQueryParts('where', where).join('&') : undefined
    return toResult(await rest('GET', actor, [collection], { query }), 'list')
  },
  async findByID(actor, collection, id) {
    return toResult(await rest('GET', actor, [collection, String(id)]), 'doc')
  },
  async create(actor, collection, data) {
    return toResult(await rest('POST', actor, [collection], { body: data }), 'wrapped')
  },
  async update(actor, collection, id, data) {
    return toResult(await rest('PATCH', actor, [collection, String(id)], { body: data }), 'wrapped')
  },
  async delete(actor, collection, id) {
    return toResult(await rest('DELETE', actor, [collection, String(id)]), 'wrapped')
  },
  async unlock(actor, email) {
    return toResult(await rest('POST', actor, ['users', 'unlock'], { body: { email } }), 'none')
  },
  async canAccessAdmin(actor) {
    const { status, body } = await rest('GET', actor, ['access'])
    if (status !== 200 || !isRecord(body)) {
      throw new Error(`GET /api/access failed with status ${status}`)
    }
    // Payload removes `canAccessAdmin: false` from the response.
    return body.canAccessAdmin === true
  },
}

/** Both transports, for `describe.each`. */
export const transports: Transport[] = [localTransport, restTransport]
