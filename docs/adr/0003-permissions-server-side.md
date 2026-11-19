# 0003 – Permissions on the server

## Context

Contributors may see and change only their own items, and only editors may publish (spec PERM-1 to PERM-8). The rules must hold for the app and for the REST API (`PATCH /api/content-items/:id`). Payload field access is yes/no per field. It cannot express "this value is not allowed", and it drops the field without an error.

## Decision

- Row scope: collection `access.read` and `access.update` return a `Where` query (own items; for contributors also "not published").
- Value rules: a collection `beforeChange` hook compares the new data with `originalDoc` and throws `APIError(message, 403)`. It covers: publish and unpublish (editor only), every change to an archived item except unarchive, and a contributor who removes themselves from `authors`.
- `role` field: update access for editors only. `access.admin`: editors only.
- Every Local API call from the app passes `user` and `overrideAccess: false`.
- Integration tests cover each rule against the Local API and the REST API.

## Consequences

- The UI only mirrors the rules (locks, tooltips). It is not the security layer.
- A rejected change returns a clear 403. The UI shows it as an error toast.
- Hooks run for REST, GraphQL, the Admin panel and the Local API, so there is one place for each rule.
