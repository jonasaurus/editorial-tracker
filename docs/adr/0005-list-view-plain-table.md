# 0005 – List view: plain shadcn Table, sorted on the server

## Context

The list view needs status tabs and sortable columns. The shadcn "Data Table" guide uses TanStack Table and sorts on the client.

## Decision

- Use the plain shadcn `Table`. No TanStack Table.
- Each sortable header is a link that sets `?sort=…&dir=…`. The server sorts. Items with no deadline come last.
- Amended 2026-11-19: the server sorts in a pure function (`compareForList`), not with Payload `find`. Reasons: the SQLite adapter puts NULL first in `asc`; Payload sorts `status` by its stored value (alphabetical), not in the workflow order; `authors` (many users) and the creator name cannot sort cleanly in `find`. The page loads all items for the tab counts, so the sort needs no extra query. The board does the same (BOARD-2).
- The status tabs are a `<nav>` of links with `aria-current="page"`, not shadcn `Tabs`.
- Accessibility: `aria-sort` on the sorted header only; the sort icon is `aria-hidden`; the title cell holds a real link to the item.
- Amended 2026-11-19: the whole row opens the item (LIST-6). The title link stretches over the row (`::after`), the same as the board card. The row has a hover fill. The row has `translate: 0 0`, because WebKit does not use a `position: relative` table row as the containing block of the link. One tab stop per row. The stretched link covers the row, so a drag on row text does not select it (the same as a card). No `onClick` on the `<tr>`: it is not a link for the keyboard or for a new tab.

## Consequences

- No client state for sorting. The URL is the single source.
- Add TanStack later only for client features (column visibility, row selection).
