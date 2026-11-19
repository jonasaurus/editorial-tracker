# 0007 – Deadlines as plain dates, one state function

## Context

Deadline text and the overdue state appear on cards, in the list, in the dialog and in the app bar count. Time zones can move a date by one day.

## Decision

- Store the deadline as a date only (`YYYY-MM-DD`). The field is a Payload `text` field with a format check (`isPlainDate`), not a `date` field. Reason: the `date` field type turns values into ISO timestamps on read and on some writes. The Admin panel shows a text input for the deadline.
- Compute `today` on the server, in Europe/Copenhagen, and pass it down.
- One pure function decides the state: `getDeadlineState(item, today)` → `none | upcoming | today | overdue | done`.
- One formatter makes the text: `formatDeadline(deadline, state, today, 'short' | 'long')`.
- One component shows it: `<DeadlineText item variant />`.
- Unit tests cover the edge cases (midnight, daylight saving time, the turn of the year).

## Consequences

- Every surface shows the same state and wording.
- No hydration mismatch, because the server decides `today`.
