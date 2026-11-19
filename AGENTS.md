# AGENTS.md

Instructions for coding agents in this repository.

## Source of truth

- Behaviour: `docs/spec.md`. Rules have ids (for example `PERM-3`). Refer to them in tests and commit messages.
- Design: `docs/design-system.md`.
- Decisions: `docs/adr/`. Add an ADR for a new decision that changes the architecture.
- If the code and the docs do not agree, stop and ask. Do not change a rule silently.

## Stack

- Next.js (App Router) + Payload CMS 3, one app. SQLite for local use.
- Frontend in the `(frontend)` route group: Server Components for reads, Server Actions for writes, Payload Local API.
- shadcn/ui + Tailwind CSS v4. Tokens in the `@theme` block of the frontend `globals.css`.
- `lucide-react` icons. `@dnd-kit/react` (pinned) for drag and drop.
- pnpm only.
- Next.js 16: read the docs for the installed version in `node_modules/next/dist/docs/`. Do not rely on training data.
- Docker runs the production build (ADR 0010). Production uses migrations, not `push`.

## Commands

```bash
pnpm dev              # start the app
pnpm check            # typecheck, lint, format check, audit, test (the pre-commit hook runs it)
pnpm test
pnpm lint
pnpm typecheck
pnpm format           # fix the format
```

After a change to a Payload collection, run these commands and commit the results:

```bash
pnpm generate:types
pnpm generate:importmap
pnpm payload migrate:create <name>
```

Before you finish a task: `pnpm check` must pass.

## Dependencies

- A new package version must be 28 days old or older. pnpm enforces this (`pnpm-workspace.yaml`). Do not add `minimumReleaseAgeExclude`.
- The exceptions are in README "Supply-chain safety". Ask before you use one.

## Rules for code

- TypeScript strict. Never use `any`. Use `unknown` and narrow it.
- Use the generated Payload types. Do not write duplicate types.
- Prefer discriminated unions for state.
- Every Local API call from the app passes `user` and `overrideAccess: false`.
- Permissions live on the server (collection access + `beforeChange` hooks). The UI only mirrors them.
- Use tokens for every colour. No literal hex values in components.
- Use the words in `docs/design-system.md` §8 in all UI text.
- Keep changes small. Do not change unrelated code.

## Tests

- Every rule in `docs/spec.md` that the server enforces has a test (Vitest, against the Local API and the REST API).
- Pure functions (for example `getDeadlineState`, `formatDeadline`) have unit tests, including edge cases.

## Git

- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- Small, focused commits on short feature branches.
- Never commit `.env` files or databases.

## Docs style

Write docs in ASD-STE100 style (Simplified Technical English): short sentences, simple words, one instruction per sentence.
