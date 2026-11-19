// Integration tests use test.env only. They never read .env, so they never
// touch the development database.
import { config } from 'dotenv'

config({ path: 'test.env' })
