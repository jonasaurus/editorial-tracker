# 0004 – The item view is a dialog, with its state in the URL

## Context

The case asks for a content view. The dashboard is the main place where people work.

## Decision

- The item view is a dialog over the dashboard, not a separate page.
- The URL holds the state: `?item=<id>`, `?view=board|list`, filters and sort.
- A cold load of an item URL renders the dialog on the server.
- Open with history `push`. Close with `replace` to the dashboard URL and keep the filters.

## Consequences

- Links to items and to filtered views can be shared.
- The page stays a Server Component. Client state is small.
- Browser Back closes the dialog and discards unsaved edits (accepted).
