# 0010 – Docker for the production build, with database migrations

## Context

A reviewer must be able to run the app from a fresh clone, without Node or pnpm. In production (`NODE_ENV=production`), Payload does not sync the database schema (`push`). The schema must come from migrations.

## Decision

- `docker compose up` builds and runs the production build. One service, port 3000.
- The image is the Next.js `standalone` output. The base image is `node:<version>-bookworm-slim`, the same version as `.nvmrc`. Debian, not Alpine, because the SQLite driver (`libsql`) ships glibc binaries.
- The image installs with `pnpm install --frozen-lockfile` and the rules in `pnpm-workspace.yaml` (release age, overrides).
- The app runs as a non-root user. The SQLite file is on a named volume (`/app/data`).
- `PAYLOAD_SECRET` is required. Compose stops with an error if it is not set.
- Migrations are in `src/migrations/` and are committed. The SQLite adapter runs them when it connects in production (`prodMigrations`). The image does not need the Payload CLI.
- Development and tests keep `push`.

## Consequences

- After a change to a collection, run `pnpm payload migrate:create <name>` and commit the migration, together with `pnpm generate:types` and `pnpm generate:importmap`.
- A migration that is missing shows only in production (Docker), not in development. Run `docker compose up --build` after a schema change to find it. CI only builds the image.
- A move to Postgres needs new migrations for the Postgres adapter.
