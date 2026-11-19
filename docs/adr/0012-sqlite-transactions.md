# 0012 – One database transaction per write, also on SQLite

## Context

ITEM-6 says that a save is one atomic update. The Payload SQLite adapter runs without transactions unless `transactionOptions` is set. Payload writes an item in more than one query (the item row, then the `authors` rows). Payload does not check that an author id is a real user, so the database foreign key rejects an unknown id. Without a transaction, the first queries stay saved: a create keeps the item row, and an update keeps the new title without the new authors. This happens on every path: Server Actions, REST and the Admin panel.

## Decision

- The SQLite adapter runs each Payload operation in one transaction (`transactionOptions: {}` in `src/payload.config.ts`). A failed query rolls back the whole operation.
- The Server Actions also check the author ids before the write, so the user gets a field message ("Choose valid authors.") and not a server error.

## Consequences

- A failed write saves nothing, on all APIs. `tests/int/transactions.int.spec.ts` tests this on the Local API and the REST API.
- SQLite allows one writer at a time. A transaction holds the write lock for the length of one operation. This is acceptable for a small newsroom.
- A move to Postgres keeps the same behaviour: the Postgres adapter uses transactions by default.
