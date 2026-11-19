# 0002 – shadcn/ui with Tailwind CSS v4 tokens

## Context

The UI needs accessible components and a custom look (sand, ink, square corners, one orange accent).

## Decision

- Use shadcn/ui components. Add them one by one when needed.
- Keep the shadcn token names (`--color-background`, `--color-primary`, …) and set our own values in a Tailwind v4 `@theme` block.
- Add tokens for what shadcn does not have: `--color-publish`, `--color-status-*`, `--color-disabled-*`, `--color-subtle`.
- Use `lucide-react` icons (the shadcn default).

## Consequences

- `docs/design-system.md` §1 and the code use the same token names.
- Component code stays close to upstream shadcn. Updates are easy.
- Every colour in the code is a token. No literal hex values in components.
