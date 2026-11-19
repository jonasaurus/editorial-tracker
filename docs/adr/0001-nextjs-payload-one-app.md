# 0001 – Next.js and Payload CMS in one app

## Context

The app needs login, two roles, access rules, a data model and a custom dashboard. It must be easy to run from a fresh clone.

## Decision

- Use Payload CMS 3 inside Next.js (App Router). One app, one `pnpm dev`.
- Use SQLite (`@payloadcms/db-sqlite`) for local use. No database server.
- Build a custom frontend in a `(frontend)` route group. Server Components read data. Server Actions change data. Both use the Payload Local API.
- Keep the Payload Admin panel at `/admin` for editors.

## Consequences

- Payload gives auth, users, roles and access control. The same rules apply to REST, GraphQL, the Local API and the Admin panel.
- The frontend has its own layout and styles, so Tailwind does not change the Admin panel.
- SQLite is not for serverless hosting. A move to Postgres is a change of adapter (`@payloadcms/db-postgres`) and a connection string.
