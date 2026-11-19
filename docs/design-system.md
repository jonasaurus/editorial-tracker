# Design system

The visual rules for the Editorial Tracker. The behaviour is in [spec.md](spec.md). This file and the code are the source of truth for the design.

Direction: Swiss editorial style. Sand background, ink text, square corners, strong type, one brand accent (orange). Built with shadcn/ui and Tailwind CSS v4. The tokens are in `src/app/(frontend)/globals.css` (see the `@theme` block).

## 1. Tokens

Token names follow shadcn/ui.

| Token | Value | Use |
|---|---|---|
| `--color-background` | `#F0F0EA` | Page (sand) |
| `--color-card`, `--color-popover` | `#F9F9F3` | Card, dialog, input, popover |
| `--color-foreground`, `--color-primary` | `#242424` | Text, primary button (ink) |
| `--color-primary-foreground` | `#F9F9F3` | Text on ink and on orange |
| `--color-muted-foreground` | `#6E6862` | Secondary text (AA on sand) |
| `--color-border`, `--color-muted` | `#E4E1DB` | Hairlines, dividers |
| `--color-input` | `#B6B4AF` | Control borders, dashed empty states |
| `--color-ring` | `#242424` | Focus |
| `--color-publish` | `#FC7230` | Brand accent (see §4) |
| `--color-publish-foreground` | = `--color-primary-foreground` | Label and icon on orange |
| `--color-destructive` | `#D01F17` | Errors, overdue (5.1:1 on card) |
| `--color-status-idea` | `#9860D0` | Status marker |
| `--color-status-draft` | `#EAAB05` | Status marker |
| `--color-status-review` | `#2784D5` | Status marker |
| `--color-status-published` | `#2E9E52` | Status marker |
| `--color-disabled-foreground` | `#9A948D` | Disabled and read-only text, placeholders |
| `--color-disabled-border` | `#D0CDC6` | Disabled and read-only borders |
| `--color-subtle` | `#E9E7E1` | Quiet fill: locked step, banner, author chip |
| `--color-accent` | = `--color-muted` | shadcn hover and focus fill (menu items, ghost buttons, calendar days). Not the brand accent |
| `--color-accent-foreground` | = `--color-foreground` | Text on the hover and focus fill |

The status colours and the red come from the brand orange in OKLCH: the hue is rotated, lightness and chroma stay close.

## 2. Type, spacing, shape

- Font: **Geist** (UI). Geist Mono only for code-like labels.
- Sizes: the Tailwind default scale. Board headings and status tabs: 24px semibold, tracking −0.02em; their counts: 24px light, muted.
- Spacing: the Tailwind default scale (4px base).
- Corners: square (radius 0). The only pill is the "Archived" label (outline).
- Shadows: only on the dialog, popovers, the dragged card and the toast.
- Board cards: one height, 112px. The title shows 2 lines or fewer; a longer title ends with an ellipsis (…). The top line (type, then deadline or published date) and the people line are one line each. The type and the people text end with an ellipsis; the date is never cut. The people line sits at the bottom of the card. The drop slot (§4) has the same height.
- Control height: 40px in dialogs and on the login screen; 32px (`size="sm"`) in the app bar and on the board.

## 3. Status

- **Marker**: a square in the status colour, in front of the column heading, the status tab and the table status label. There are no status pills.
- **Size**: the cap height of the text next to it. The bottom of the square sits on the baseline. In CSS: `size-[1cap]` with `align-items: baseline`. Fallback for Geist: `0.71em`.
- **Gap** from square to label: 8px.
- The status colours are never used for text.

### Stepper (item dialog)

- Four chevron segments (Idea, Draft, Review, Published), 10px deep.
- Selected step: filled with its status colour, white semibold label. Exception: Draft (gold) has an ink label.
- Finished steps: a check icon and a muted label.
- Locked step: `--color-subtle` fill, a lock icon, muted label, tooltip.
- Read-only (archived, or published for a contributor): the selected step uses its status colour at 50% opacity, with an ink label. The other labels, checks and borders use the disabled greys.

## 4. Orange (brand accent)

Orange means emphasis. Green means published. Use orange only for:

- the armed "Publish" button (white label and icon);
- the Published column during a drag (pulse, drop slot, heading rule);
- the 2px rule under the active Board/List item and under the active status tab.

### Drop targets (board)

- During a drag, the item stays in its column as a ghost: dashed border, muted text, no fill. The dragged copy tilts by 2° and has a shadow.
- Over Published: the publish pulse, a light orange fill, an orange border, and a dashed orange slot "Drop to publish" at the top (the newest published item is first, BOARD-2). The highlight is outside the column box, so the layout does not move.
- Over another column: a neutral border outside the column box, and a neutral dashed slot "Move to <Status>" where the card will land (its sorted place, BOARD-2). No orange.
- A column where the user cannot drop (a contributor and Published): a dashed slot with a lock icon and "Only editors can publish items", from the start of the drag. No pulse.

### Publish pulse

The armed Publish button and the drop target (the Published column) use **one** animation, so the two ways to publish feel related.

- Values: from the Magic UI Pulsating Button (variant `pulse`). The component is not installed: the keyframes are in `globals.css`.
- A crisp `box-shadow` ring grows from 0 to 8px and back in 1.5s, in publish orange at 50%.
- One shared utility (`animate-publish-pulse`) for the button and the column.
- Reduced motion: no animation; a static 4px ring.

## 5. Deadlines

One state function and one formatter (spec DL-1 to DL-5).

| State | Short (card, list) | Long (dialog) | Style |
|---|---|---|---|
| Upcoming | 24 Nov | 24 Nov 2026 | 500, ink |
| Another year | 8 Jan 2027 | 8 Jan 2027 | 500, ink |
| Today | Today | Today · 19 Nov 2026 | 600, ink |
| Overdue | 17 Nov · 2 days overdue | 17 Nov 2026 · 2 days overdue | 600, destructive |
| No deadline | No deadline | empty field, placeholder "No deadline" | 400, muted |
| Published or archived | 13 Nov | 13 Nov 2026 | 400, muted (dialog value stays ink) |

On a board card, a published item shows "Published 12 Nov" or "Published today" instead of the deadline (BOARD-3). The list shows the deadline.

- The date comes first, then the qualifier. No "Due" prefix.
- The short form shows the year only when it is not the current year.
- Singular: "1 day overdue".
- In the dialog, an overdue date is red text in a normal field. A red border means an input error only.
- In the dialog, the deadline style follows the saved status. An armed Publish still shows an overdue deadline as overdue.
- The list's Deadline column is 200px wide.

## 6. Metadata and counts

- Metadata lines in the dialog, in this order: Created → Published or Archived → Updated.
  - "Created by Sara Nielsen · 2 Nov"
  - "Published 12 Nov · updated 12 Nov 14:05"
  - "Archived today 10:40" (the time of the last update: an archived item is read-only, and there is no `archivedAt`, MODEL-3)
- Dates use the deadline formatter, plus a time for events.
- A line starts with a capital letter. After "·", use lowercase.
- Counts: "14 items · 2 overdue · 1 archived" (app bar), "3 · 1 archived" (column). "overdue" is always 600 and red. In a column count, the archived part is 14px regular.

### Kicker (item dialog)

The line above the title. The separators (" · ", " → ") are not strong.

- New item: "New item".
- Saved item: "Article · **Review**". When another step is selected: "Article · **Review** → **Published**".
- Archived item: "Article · Review · **Archived**". Only "Archived" is strong (the status cannot change).

## 7. Messages

- **Banner** (a restriction on the whole item): `--color-subtle` fill, 3px ink left rule, icon, text.
- **Lock + tooltip** (a restriction on one control).
- **Toast** (errors only, Sonner): ink background, 3px red left rule, `CircleAlert` icon, title + text.
- **Field error**: red border + red message under the field.
- **Empty state**: dashed `--color-input` border, title (14px semibold) + next step (12px muted). Optional action button. In the list view, the box is outside the table, full width under the header line.

## 8. Words

Use one word for one thing.

| Concept | Word | Do not use |
|---|---|---|
| A thing on the board or in the list | item | card |
| A person on the item | author | co-author |
| The person who made the item | creator, "Created by" | owner |
| The date the item must be done | deadline | due |
| Roles | Editor, Contributor | admin (as a role) |
| The Payload admin | Admin panel | Admin |

Buttons are verbs: New item, Create item, Save changes, Publish, Archive, Unarchive, Close, Cancel, Discard changes, Remove deadline, Clear filters, Log in, Log out.

Text style: short sentences, simple words. An error says what is wrong, then what to do. An empty state says the state, then the next step.

## 9. Icons

`lucide-react`, 16px (14px in small controls), stroke 2, round caps and joins.

Used: `Columns4` (Board), `List`, `Plus`, `ChevronDown`, `User`, `ArrowUpRight`, `X`, `Check`, `Lock`, `Calendar`, `Archive`, `ArrowRight`, `ArrowDown`, `ArrowUp`, `CircleAlert`, `ChevronLeft`, `ChevronRight` (calendar), `ChevronUp` (select).

## 10. Components (shadcn/ui)

| Need | Component |
|---|---|
| Buttons | `Button` (default, outline, ghost; `size="sm"` in the app bar) |
| User menu | `DropdownMenu` |
| Type and Author filters | `DropdownMenu` with radio items; ghost `size="sm"` trigger |
| Show archived | `Checkbox` |
| Item dialog, Not found | Radix `Dialog` primitive, no portal, so the dialog is in the server HTML (ITEM-1). 680px; 520px for messages |
| Confirm (discard, archive) | `AlertDialog` |
| Type field | `Select` |
| Login fields | `Input` + `Label` |
| Authors | Chips + `DropdownMenu` with checkbox items (a checkable list, no search field). The menu stays open after each change. It opens under the whole field (left edges aligned). The check is on the left |
| Deadline | Date picker (`Popover` + `Calendar`) |
| List view | `Table` (plain, server-sorted); the status tabs are a `<nav>` of links |
| Toast | `Sonner` |
| Tooltip | `Tooltip` |
| Publish pulse | `animate-publish-pulse` utility (§4) on a `Button` |

## 11. Layout

### App bar

- Order: mark, user menu, counts, filters, Board/List switch, then "New item" on the right.
- `md` and up: one row. A group goes to the next row only when it does not fit. A 1px divider sits between groups. A group at the start of a row has no divider.
- Below `md`: mark, user menu and "New item"; then the counts; then the filters. There is no view switch (LIST-5).

### Status tabs

- 24px text. The text sits 14px above the 2px orange rule of the active tab.

### List table

- Rows are 48px high. The title wraps. Card and list titles use `text-wrap: balance`.
- Column widths (12px padding on each side included): Title at least 240px, Deadline 200px + padding. At `xl` and up: Type 120px, Status 120px, Authors 220px, Created by 160px. Below `xl`, these four are only as wide as their text, and the authors wrap only after a comma.
- When the table is wider than the screen, it scrolls in its box.

### Dialogs

- Item dialog: 680px wide, 80px from the top (`md` and up). Message dialog (Not found): 520px wide, 200px from the top.
- Small screens: 16px from each edge.
- The dialog scrolls inside. The footer with the buttons stays at the bottom.
