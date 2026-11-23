# 0021. Serverless packaging and quality gates

- Status: Accepted
- Date: 2026-11-23

## Context
The Hono API runs as one Vercel function under `/api` (see [0017](0017-project-structure.md)). The function must resolve workspace packages and TypeScript sources reliably, and the pipeline needs a concrete coverage threshold (see [0018](0018-ci-cd-pipeline.md)).

## Decision
- `apps/api` is bundled with esbuild into `apps/api/dist/vercel.mjs`, with workspace packages and dependencies inlined. The committed `api/index.mjs` only re-exports it, so Vercel detects one Node function and never compiles workspace TypeScript itself.
- The function exports a web-standard `{ fetch }` handler, and `vercel.json` rewrites `/api/*` to it.
- Every package enforces a minimum of 80% lines, functions, branches and statements through Vitest coverage.
- `vercel.json` sends security headers on every response: `nosniff`, frame denial, a strict referrer policy and HSTS. A content security policy is deferred until the app loads third-party content.

## Alternatives considered
- Letting Vercel compile `apps/api` directly: depends on how it resolves workspace TypeScript and extensions, which is fragile in a monorepo.
- A single global coverage figure: hides an untested package behind a well tested one.

## Consequences
- The build must run before deploy, which `pnpm build` already does.
- Raising the coverage threshold is a deliberate change recorded in a new ADR.
