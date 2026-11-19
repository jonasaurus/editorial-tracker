/**
 * Deletes all users and items, then seeds the demo data. Development only.
 * Run it with `pnpm seed`.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { seed } from './seed'

if (process.env.NODE_ENV === 'production') {
  throw new Error('pnpm seed deletes all data. It does not run when NODE_ENV is production.')
}

// The seed below runs once. onInit must not also run it.
const payload = await getPayload({ config, disableOnInit: true })

// Items first: they refer to users.
const items = await payload.delete({
  collection: 'content-items',
  where: { id: { exists: true } },
})
const users = await payload.delete({
  collection: 'users',
  where: { id: { exists: true } },
})
const errors = [...items.errors, ...users.errors]
if (errors.length > 0) {
  throw new Error(
    `Reset: ${errors.length} deletes failed: ${errors.map((e) => e.message).join('; ')}`,
  )
}
payload.logger.info(`Reset: deleted ${items.docs.length} items and ${users.docs.length} users.`)

await seed(payload)
process.exit(0)
