import { sqliteAdapter } from '@payloadcms/db-sqlite'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { ContentItems } from './collections/ContentItems'
import { Users } from './collections/Users'
import { migrations } from './migrations'
import { seed } from './seed/seed'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, ContentItems],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || '',
    },
    // Production (Docker) runs the migrations on connect. Dev and tests use `push`.
    prodMigrations: migrations,
  }),
  plugins: [],
  // ROLE-4: seed the demo data on the first start, when the database has no users.
  onInit: async (payload) => {
    if (process.env.SEED_ON_START !== 'false') await seed(payload)
  },
})
