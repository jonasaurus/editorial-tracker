# 0011 – Login and session

## Context

The app has its own login page (`/login`, spec LOGIN-1 to LOGIN-4). The Admin panel has its own login. Both must use the same session, so that an editor can open the Admin panel from the app. Payload 3 keeps a session row for each login (`useSessions`) and puts its id in the JWT. Next.js 16 has a proxy (`proxy.ts`), Server Components and Server Actions.

## Decision

- A Server Action logs in with the Local API (`payload.login`). It sets the cookie that Payload builds (`generatePayloadCookie`), so the app and the Admin panel use one cookie (`payload-token`, httpOnly, SameSite Lax).
- We do not use the `login` and `logout` helpers of `@payloadcms/next`. The login helper starts the jobs cron and throws plain errors. The logout helper keeps the cookie when the token is already invalid.
- Logout deletes the session row (`logoutOperation`), so the old token stops working. Then it always deletes the cookie.
- Two checks:
  - The proxy only checks that the cookie exists, for `GET` and `HEAD`. It redirects to `/login?next=<url>`. It does not touch Server Action POSTs, because a 307 keeps the POST and the action would fail. It never redirects away from `/login`, because an expired cookie would cause a loop.
  - The real check is `getUser()` (`payload.auth`) in each page and each Server Action.
- `next` must be a path on this site. Other values become `/`.
- A session lasts 8 hours (one work day). Payload does not refresh the token on the server.
- `secure` comes from `COOKIE_SECURE` (default off), because Docker serves the app over plain http.
- A locked account (LOGIN-4) gives the same text as a wrong password (LOGIN-2).
- The demo users show on the login screen only when `NODE_ENV` is `development` (ROLE-4).

## Consequences

- The auth operations (login, auth, logout) cannot pass `user`. They are the only exception to PERM-8.
- After 8 hours the user must log in again. Unsaved edits in the dialog are lost.
- An unknown email gives the answer faster than a wrong password, because Payload skips the password hash. A timing attack can find out which emails exist. We accept this for a small newsroom tool. The REST login (`/api/users/login`) also shows Payload's own lockout message.
- Behind HTTPS, set `COOKIE_SECURE=true`.
