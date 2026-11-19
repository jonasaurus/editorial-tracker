# Architecture decision records

Short records of the main decisions. Format: Context, Decision, Consequences.

| ADR | Decision |
|---|---|
| [0001](0001-nextjs-payload-one-app.md) | Next.js and Payload CMS in one app, SQLite for local use |
| [0002](0002-shadcn-tailwind-tokens.md) | shadcn/ui with Tailwind CSS v4 tokens |
| [0003](0003-permissions-server-side.md) | Permissions on the server: access control + `beforeChange` hook |
| [0004](0004-item-dialog-in-url.md) | The item view is a dialog, with its state in the URL |
| [0005](0005-list-view-plain-table.md) | List view: plain shadcn Table, sorted on the server |
| [0006](0006-drag-and-drop-dnd-kit.md) | Drag and drop with `@dnd-kit/react` |
| [0007](0007-deadlines-plain-dates.md) | Deadlines as plain dates, one state function |
| [0008](0008-live-updates-polling.md) | Live updates by polling a version |
| [0009](0009-publish-pulse-magic-ui.md) | One publish pulse from Magic UI |
| [0010](0010-docker-and-migrations.md) | Docker for the production build, with database migrations |
| [0011](0011-auth-and-session.md) | Login with a Server Action and Payload sessions; the proxy checks only the cookie |
