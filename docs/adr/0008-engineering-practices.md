# 0008. Engineering practices baseline

- Status: Proposed
- Date: 2026-11-23

## Context
Automatic merge to production (see [0006](0006-agent-driven-delivery-workflow.md)) makes automated quality gates the main protection. These practices were proposed and are pending the owner's explicit confirmation.

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
To be recorded per practice when confirmed.

## Consequences
Each practice is confirmed or rejected during the design phase; accepted ones move to their own ADR or update this one to Accepted.
