# Editorial Tracker – product specification

This document is the source of truth for behaviour. The design rules are in [design-system.md](design-system.md). The reasons for the main technical choices are in [adr/](adr/).

Each rule has an id (for example `PERM-3`). Tests and commit messages refer to these ids.

## 1. Purpose

A small newsroom plans its content in the Editorial Tracker. An item (an article, a video, a podcast episode or a newsletter) moves through four statuses: Idea, Draft, Review and Published. Editors manage all items. Contributors manage their own items.

## 2. Users and roles

| Role | Can do |
|---|---|
| **Editor** | See and change all items. Set any status, including Published. Archive and unarchive any item. Use the Admin panel (`/admin`). |
| **Contributor** | See and change only own items. Set the status to Idea, Draft or Review. Cannot publish. |

- **ROLE-1** A user has one role: `editor` or `contributor`.
- **ROLE-2** Only an editor can change the `role` field of a user.
- **ROLE-3** Only an editor can open the Admin panel.
- **ROLE-4** The app seeds 1 editor and 2 contributors with known passwords. The login screen lists them in development only ("Demo users · dev only").
- **ROLE-5** Every logged-in user can read all users (for the author picker). Without a login, nobody can read users.
- **ROLE-6** A user can change their own user (for example the name). Only an editor can create users, change other users, delete users or unlock a locked account.
- **ROLE-7** The first user gets the role `editor`. Later users get `contributor` unless an editor sets the role.

## 3. Item model

| Field | Type | Rules |
|---|---|---|
| `title` | text | Required. |
| `status` | `idea` \| `draft` \| `review` \| `published` | Default `idea`. |
| `type` | `article` \| `video` \| `podcast` \| `newsletter` | Required. |
| `authors` | users, many | At least the creator on create (see AUTH-1). |
| `deadline` | date only (`YYYY-MM-DD`) | Optional. No time, no time zone. |
| `createdBy` | user | Set by the server on create. Read-only. |
| `archived` | boolean | Default `false`. Not a status. |
| `publishedAt` | date-time | Set by the server. Read-only. |
| `createdAt`, `updatedAt` | date-time | Set by Payload. |

- **MODEL-1** `createdBy` is set from the logged-in user when the item is created. A request cannot set or change it.
- **MODEL-2** `publishedAt` is set each time the status changes to `published`, also on create. It keeps its value when the item is unpublished. The UI shows the published date only while the status is `published`.
- **MODEL-3** There is no `updatedBy`, `archivedBy` or `archivedAt`. The UI shows `createdBy`, `createdAt` and `updatedAt` only.

## 4. Permissions

"Own item" means: the user is `createdBy`, or the user is in `authors`.

- **PERM-1** A contributor can read only own items. This applies to the list, to a single item and to every API (REST, Local API, Admin panel).
- **PERM-2** A contributor can update only own items that are not published.
- **PERM-3** Only an editor can set the status to `published`, or change the status of a published item (unpublish).
- **PERM-4** A contributor can set the status to `idea`, `draft` or `review`, in any order. An editor can set any status, in any order.
- **PERM-5** Only an editor can archive or unarchive a published item. A contributor can archive or unarchive own unpublished items.
- **PERM-6** An archived item is read-only. The server rejects every change except unarchive. A save that sends the unchanged status is not a status change.
- **PERM-7** No delete in the app. Archive replaces delete. An editor can delete in the Admin panel.
- **PERM-8** The server enforces all rules. The UI only hides or locks actions that the server rejects. Local API calls from the app use the logged-in `user` and `overrideAccess: false`.

### Authors

- **AUTH-1** A new item starts with the current user in `authors`.
- **AUTH-2** A contributor can add or remove other authors on own items, but cannot remove themselves. The server rejects such an update. In the UI, the contributor's own row is checked and disabled, and the own chip reads "<name> (you)" with no remove button.
- **AUTH-3** An editor can change `authors` freely.

## 5. Deadlines

- **DL-1** `today` is the current calendar date in Europe/Copenhagen, computed on the server.
- **DL-2** One function decides the state: `getDeadlineState(item, today)` returns `none | upcoming | today | overdue | done`.
  - `done`: the item is published or archived.
  - `none`: no deadline.
  - `overdue`: deadline < today.
  - `today`: deadline = today.
  - `upcoming`: deadline > today.
- **DL-3** Compare plain dates. Never compare timestamps (this prevents off-by-one errors from UTC).
- **DL-4** One formatter makes all deadline text: `formatDeadline(deadline, state, today, 'short' | 'long')`. See the design system for the text and the styles.
- **DL-5** The overdue count in the app bar uses the same rule as the cards.

## 6. Screens and behaviour

### 6.1 Login (`/login`)

- **LOGIN-1** Email and password. The server calls Payload `login` and sets the `payload-token` cookie as httpOnly.
- **LOGIN-2** Wrong email or wrong password gives the same message: "The email or password is not correct." (Do not show which users exist.)
- **LOGIN-3** A logged-in user who opens `/login` goes to `/`. A user without a session goes to `/login?next=<url>` and returns to `next` after login.
- **LOGIN-4** After 5 failed logins, the account is locked for 10 minutes. A locked account gives the same message as LOGIN-2.

### 6.2 Dashboard (`/`)

The dashboard is the only page. One app bar holds: the mark, the user menu, the counts, the filters, the Board/List switch and "New item".

- **DASH-1** The view is in the URL: `?view=board` (default) or `?view=list`.
- **DASH-2** Filters: Type, Author (editors only), Show archived. Filters are in the URL: `?type=article`, `?author=<user id>`, `?archived=1`. A value that is not valid has no effect.
- **DASH-3** The Author filter matches `authors` OR `createdBy`.
- **DASH-4** Counts follow the Type and Author filters, not the status. Format: "14 items · 2 overdue · 1 archived". "n items" and "n overdue" count items that are not archived. Hide "· n overdue" when n is 0. "· n archived" shows only while "Show archived" is on, and only when n is more than 0. With a filter that hides items: "0 of 14 items" (14 = all items that are not archived, with no filters).
- **DASH-5** Archived items are hidden unless "Show archived" is on.
- **DASH-6** User menu: name and role (not clickable), "Admin panel ↗" (editors only, opens a new tab), "Log out".

### 6.3 Board view

- **BOARD-1** Four columns, one per status. Each column shows its count.
- **BOARD-2** Cards in the Idea, Draft and Review columns are sorted by deadline, earliest first. Items with no deadline come last. Cards in the Published column are sorted by `publishedAt`, newest first. Items with no `publishedAt` come last. Archived cards come after the other cards, in the same order. Equal values: sort by title, then by id.
- **BOARD-3** A card shows: type, deadline, title, authors and creator ("Sara Nielsen · created by Mette Holm"). A card in the Published column shows the published date ("Published 12 Nov" or "Published today") in place of the deadline. A card with no authors shows "Created by <name>". An archived card also shows an "Archived" label. All cards have the same height: a long title is cut after 2 lines with an ellipsis, and the item dialog shows the full title.
- **BOARD-4** A click on a card opens the item dialog.

### 6.4 Drag and drop (board, desktop only)

- **DND-1** Drag a card to another column to change its status. The same rules as the dialog apply, and the server checks them. Archived items and a contributor's published items cannot be dragged. A window resize during a keyboard drag cancels the drag.
- **DND-2** A column where the user cannot drop is marked as not allowed (for a contributor: Published). A drop there does nothing. A drop on the column of the item does nothing.
- **DND-3** During a drag over Published, the column shows the publish pulse (the same animation as the armed Publish button).
- **DND-4** If the server rejects the change, the card goes back to its old column, and an error toast shows.
- **DND-5** Keyboard and screen-reader users can move a card (the library gives this).
- **DND-6** There is no undo. To undo a move, drag the card back.

### 6.5 List view

- **LIST-1** Status tabs (All, Idea, Draft, Review, Published) with counts. The tabs are links that change the URL (`?status=draft`; no `status` is All). A count follows the Type and Author filters and counts items that are not archived. While "Show archived" is on, a tab with archived items also shows "· n archived" (the same as the column count).
- **LIST-2** Columns: Title, Type, Status, Authors, Created by, Deadline.
- **LIST-3** Sort by a column header. The sort is in the URL (`?sort=title|type|status|authors|creator|deadline&dir=asc|desc`). The server sorts. Default: deadline ascending, no deadline last. A click on the sorted column changes the direction. A click on another column sorts it ascending. Empty values (no deadline, no authors, no creator) come last in both directions. Status sorts in the workflow order. Authors sort by the names in their stored order. Equal values: sort by deadline, then title.
- **LIST-4** Archived rows (with "Show archived" on) are greyed, show an "Archived" label, and come after the other rows in the same order. There is no "Archived" tab.
- **LIST-5** On small screens (below 768px), the list view is the only view. There is no drag and drop on mobile. The Board/List switch is hidden, and `?view=board` shows the list.
- **LIST-6** A click anywhere on a row opens the item dialog. The title is the only link, so each row is one tab stop.

### 6.6 Item dialog

The item dialog is the content view. It is a dialog over the dashboard, not a separate page.

- **ITEM-1** The open item is in the URL (`?item=<id>`; a new item: `?item=new`). A cold load of that URL renders the dialog on the server. The other dashboard links on the page do not include `item`.
- **ITEM-2** Open with a history `push`. Close with `replace` to the dashboard URL, and keep the filters.
- **ITEM-3** Fields: title, status (stepper), type, deadline, authors. A metadata line shows creator and dates. The title is one paragraph: Enter saves, line breaks become spaces, and the save removes spaces at the start and end.
- **ITEM-4** Status stepper: the user selects a step. Steps the user cannot select are locked, with a lock icon and a tooltip (for a contributor: "Only editors can publish items").
- **ITEM-5** Publish is "armed": when an editor selects the Published step, the footer button changes from "Save changes" to "Publish", with the publish pulse. There is no separate Publish button. Publish is armed only for a saved item: on a new item, the button stays "Create item", with no pulse.
- **ITEM-6** Publish is one atomic update. If validation fails, the status does not change.
- **ITEM-7** The dialog closes after a successful save or publish. The card moves to its new column. No success toast. "Save changes" with no edits closes the dialog and sends no request.
- **ITEM-8** Archived item: a banner at the top ("This item is archived. It is read-only and hidden unless “Show archived” is on. Unarchive to edit it again."), all fields read-only, and one button: "Unarchive". After a successful unarchive the dialog stays open and the fields can be edited. If the user cannot unarchive the item (a contributor and a published item, PERM-5), the banner text is "This item is archived. Only editors can unarchive a published item." and the button is "Close".
- **ITEM-13** A contributor who opens an own published item (not archived) sees it read-only (PERM-2): a banner "This item is published. Only editors can change it.", all fields read-only, and one button: "Close".
- **ITEM-9** Archive and Unarchive ask for confirmation. If the form has unsaved edits, the edits are discarded. After a successful archive the dialog closes.
- **ITEM-10** Close (Esc, ✕, Cancel, click outside) asks for confirmation when the form has unsaved edits. Browser Back discards edits.
- **ITEM-11** New item: kicker "New item", status Idea, type Article, the current user in authors. The current user cannot remove themselves here (the server adds the creator back, AUTH-1). Buttons: "Cancel" and "Create item".
- **ITEM-12** Not found: the same small dialog for a missing id, a malformed id and an item without access. Text: "This item does not exist, or you do not have access to it." Next step: "Check the link, or ask an editor to add you as an author." Button: "Close".

### 6.7 Empty states

Pattern: the state, then the next step.

- **EMPTY-1** No items at all (the user can see no item, archived items included): "No items yet" / "Create the first item with “New item” at the top right." On the board, one box shows under the column headings.
- **EMPTY-2** Empty column: Idea "No ideas" / "Add one with New item." · Draft "No drafts" / "Move an idea here when you start writing." · Review "Nothing to review" / "Move a draft here when it is ready for an editor." · Published "Nothing published yet" / "Move an item to Review. An editor publishes it." In the list, an empty status tab shows: Idea "No ideas" / "Add one with New item." · Draft "No drafts" / "Set an idea to Draft when you start writing." · Review "Nothing to review" / "Set a draft to Review when it is ready for an editor." · Published "Nothing published yet" / "Set an item to Review. An editor publishes it." An empty All tab (only archived items, "Show archived" off): "No active items" / "Turn on “Show archived” to see archived items."
- **EMPTY-3** Filters with no results: "No items match these filters" / "Change the filters, or clear them to see all 14 items." + "Clear filters". "Clear filters" turns off Type, Author and Show archived, and keeps the view, the status tab and the sort.

### 6.8 Errors and feedback

- **ERR-1** There is one toast type: errors. No success toasts.
- **ERR-2** Error text: what is wrong, then what to do. Example: "Item not moved" / "The server did not respond. The item went back to Review. Try again."
- **ERR-3** Access lost while the dialog is open (for example, an editor removed the contributor from authors): show "You no longer have access to this item." and close the dialog.
- **ERR-4** Concurrent edits: the last save wins.
- **ERR-5** Expired session: go to `/login?next=<current URL>`.

### 6.9 Live updates

- **LIVE-1** The dashboard updates when other users change items. A small hook asks the server for a cheap "version" (today, count and latest `updatedAt` of the items the user can read) about every 5 seconds, on window focus and when the tab becomes visible: `GET /api/content-items/version`. It calls `router.refresh()` only when the version is not the version of the page on screen. Without a session, the endpoint gives 401 and the page opens the login page (ERR-5).
- **LIVE-2** The hook pauses while the tab is hidden, while the dialog has unsaved edits or an open confirm, during a drag, and while a move is pending.

## 7. API

- **API-1** The Payload REST API gives the routes: list, create, read, update (`PATCH /api/content-items/:id`, also for status), delete (editors only, PERM-7), and the live-update version (`GET /api/content-items/version`, LIVE-1).
- **API-2** The same rules apply to REST, the Local API and the Admin panel. GraphQL is off. Collection access returns a `Where` query (row scope). Value rules (PERM-3, PERM-4, PERM-6, AUTH-2) are in a collection `beforeChange` hook that compares the new value with the old document and throws `APIError(…, 403)`.
- **API-3** The row scope for "own item" is `createdBy equals <user>` OR `authors equals <user>`. On `authors` (many users), `equals` matches when one of the authors is the user. `in` and `contains` give the same result. Do not use `not_equals` or `not_in` on `authors`: they compare each author on its own, so an item with 2 authors also matches.

## 8. Non-goals (later)

- Search, "Create another", activity history, comments.
- Optimistic locking for concurrent edits.
- Realtime push (SSE or Postgres LISTEN/NOTIFY) instead of polling.
- A mobile layout for the board.
- Notifications when the status of an item changes (for example in Slack).
- Dark mode.

## 9. Open points

None.
