# 0008 – Live updates by polling a version

## Context

The dashboard must show changes from other users. Payload has no built-in realtime feature (WebSocket or SSE).

## Decision

- A small client component asks a Payload endpoint for a cheap version about every 5 seconds, and at once on window focus and when the tab becomes visible: `GET /api/content-items/version`.
- The version is today's date (Europe/Copenhagen), the item count and the latest `updatedAt` of the items that the user can read. The endpoint reads as the user, so a contributor's version follows own items only.
- The page also reads the version when it renders and gives it to the component. When the endpoint gives another version, the component calls `router.refresh()`.
- The component does not poll while the tab is hidden, while the dialog has unsaved edits or an open confirm, during a drag, and while a move is pending. It also does not poll while its own refresh is pending.
- When the endpoint gives 401, the component refreshes once and stops until the next focus or visible event. The page then opens the login page (ERR-5).
- When the page does not render a new version within 10 seconds after a refresh, the component polls again.

## Why an endpoint, not a Server Action

Next.js sends Server Actions one at a time per client. A poll as a Server Action would wait in the same queue as a save or a move, and could delay them. A GET endpoint runs on its own. A Payload endpoint gets the Payload session from the cookie, and the proxy does not redirect `/api` requests.

## Consequences

- No sockets and no extra service. Works with SQLite and Postgres, and on serverless hosting.
- The page reads the version before the items. If a change lands between the two reads, the next poll refreshes once more. The other order could miss a change.
- Own saves do not cause a second refresh: the action refreshes the page, and the page gives the new version.
- The version includes today, so a board that is open at midnight shows the new deadline states.
- A change of a user name does not change the version. The next refresh shows it.
- A refresh that runs when a save starts delays the save by one page render (the Next.js router runs them in order).
- When another user moves the item that has the keyboard focus, the focus is lost.
- Next step, if needed: Server-Sent Events with Postgres LISTEN/NOTIFY, sent after the transaction commits.
