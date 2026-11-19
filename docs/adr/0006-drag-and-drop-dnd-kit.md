# 0006 – Drag and drop with @dnd-kit/react

## Context

Users drag a card to another column to change its status (spec DND-1 to DND-6). There is no reordering inside a column. Some drops are not allowed. Keyboard and screen-reader support is necessary. shadcn/ui has no drag-and-drop component.

## Decision

- Use `@dnd-kit/react` with one drop zone per column. No sortable lists.
- Pin the exact version, because the package is still 0.x.
- Do not use community kanban wrappers. They use the older `@dnd-kit/core` and add sorting that we do not need.
- The server action checks every drop. On a rejected drop, the card goes back and an error toast shows.
- No drag and drop on small screens (list view only).

## Consequences

- Keyboard dragging and live-region announcements come from the library.
- Fallback if the 0.x API causes problems: `react-aria` `useDrag` / `useDrop`, which also handle "not allowed" targets well.
