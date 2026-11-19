# 0006 – Drag and drop with @dnd-kit/react

## Context

Users drag a card to another column to change its status (spec DND-1 to DND-6). There is no reordering inside a column. Some drops are not allowed. Keyboard and screen-reader support is necessary. shadcn/ui has no drag-and-drop component.

## Decision

- Use `@dnd-kit/react` with one drop zone per column. No sortable lists.
- Amended 2026-11-19: the drop slot shows where the card will land. The app computes this place from the BOARD-2 sort (`getDropIndex`). The user cannot choose a place in the column.
- Pin the exact version, because the package is still 0.x.
- Do not use community kanban wrappers. They use the older `@dnd-kit/core` and add sorting that we do not need.
- The server action checks every drop. On a rejected drop, the card goes back and an error toast shows.
- No drag and drop on small screens (list view only).

## Consequences

- Keyboard dragging and live-region announcements come from the library.
- Version 0.5.1 for `@dnd-kit/react` and `@dnd-kit/dom`. Keep both on the same version: the drag overlay checks the `Feedback` plugin class from `@dnd-kit/dom`.
- The title link of the item is the drag handle. A mouse drag starts after 5px of movement. A click without movement opens the item.
- The link keeps link semantics: it has `role="link"` and an empty `aria-roledescription`. Without them, the library sets `role="button"` and the role description "draggable".
- The keyboard drag starts with Space, because Enter opens the item. The arrow keys move one column. Space or Enter drops. Escape or Tab cancels.
- Every column is a drop target. The drop handler checks the rules (`canDropOn`). Reason: the library skips a column that does not accept the item, and the item can then drop in the next column.
- The drop handler runs in `useDragDropMonitor`, not in the provider props. Reason: the provider runs its callbacks in a React transition, and the drop then waits for the server.
- Fallback if the 0.x API causes problems: `react-aria` `useDrag` / `useDrop`, which also handle "not allowed" targets well.
