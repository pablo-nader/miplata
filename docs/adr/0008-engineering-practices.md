# 0008. Engineering practices baseline

- Status: Accepted
- Date: 2026-11-23

## Context
Automatic merge to production (see [0006](0006-agent-driven-delivery-workflow.md)) makes automated quality gates the main protection.

## Decision
- Store money as integer minor units (cents) or Postgres `numeric`, never as floating point.
- Test pyramid: Vitest for unit tests, integration tests against a real Postgres (a Neon branch per pull request), Playwright only for critical flows, and a minimum coverage threshold in CI.
- Preview deployment per pull request, with its own ephemeral Neon branch.
- Versioned migrations with `drizzle-kit`, applied by CI before deploy, never by hand in production.
- Protected `main`: no direct pushes, required CI, linear history, Conventional Commits enforced with commitlint.
- TypeScript `strict`, Biome for lint and formatting, a pre-commit hook, and environment variables validated with Zod at startup.
- Secrets only in Vercel and GitHub, never in the repository; Renovate or Dependabot for dependency updates; secret scanning enabled.
- pnpm workspaces monorepo: `apps/web`, `apps/api`, `packages/shared`.

## Alternatives considered
- Floating point for money: rejected, it produces rounding errors such as `0.1 + 0.2 = 0.30000000000000004`.
- ESLint plus Prettier: rejected in favor of Biome, a single faster tool for lint and formatting.
- Separate repositories for web and API: rejected, a monorepo keeps shared types in one place.
- Integration tests against mocks or an in-memory database: rejected, they miss real Postgres behavior.

## Consequences
- CI enforces every practice on each pull request, so no change reaches production without passing them.
- More setup before the first feature ships.
