# 0008 – Live updates by polling a version

## Context

The dashboard must show changes from other users. Payload has no built-in realtime feature (WebSocket or SSE).

## Decision

- A small client hook asks a Server Action for a cheap version (latest `updatedAt` + item count) about every 5 seconds and on window focus.
- When the version changes, the hook calls `router.refresh()`.
- The hook pauses while the tab is hidden or the dialog has unsaved edits.

## Consequences

- No sockets and no extra service. Works with SQLite and Postgres, and on serverless hosting.
- Next step, if needed: Server-Sent Events with Postgres LISTEN/NOTIFY, sent after the transaction commits.
