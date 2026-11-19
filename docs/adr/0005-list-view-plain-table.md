# 0005 – List view: plain shadcn Table, sorted on the server

## Context

The list view needs status tabs and sortable columns. The shadcn "Data Table" guide uses TanStack Table and sorts on the client.

## Decision

- Use the plain shadcn `Table`. No TanStack Table.
- Each sortable header is a link that sets `?sort=…&dir=…`. Payload `find` sorts on the server. Items with no deadline come last.
- The status tabs are a `<nav>` of links with `aria-current="page"`, not shadcn `Tabs`.
- Accessibility: `aria-sort` on the sorted header only; the sort icon is `aria-hidden`; the title cell holds a real link to the item.

## Consequences

- No client state for sorting. The URL is the single source.
- Add TanStack later only for client features (column visibility, row selection).
