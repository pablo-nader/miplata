# 0018. CI/CD pipeline

- Status: Superseded by [0045](0045-no-preview-deployments-and-pg-driver.md) (preview rule)
- Date: 2026-11-23

## Context
Merges to `main` deploy to production automatically (see [0006](0006-agent-driven-delivery-workflow.md)), so CI is the main gate. Database migrations must be applied before the code that needs them is live.

## Decision

### On every pull request (GitHub Actions)
1. Conventional Commits check (commitlint) on every commit of the branch.
2. Lint and format check (Biome).
3. Type check across the workspace.
4. Unit tests (Vitest) with a minimum coverage threshold.
5. Integration tests (Vitest) of the API against a real **Postgres service container** in the CI job, with migrations applied from scratch. Includes the data-isolation tests for every endpoint.
6. Translation check: `es` and `en` have the same keys.
7. Production build of web and API.
8. End-to-end tests (Playwright) of the critical flows against the built app and the same Postgres container.

### Preview deployments
- Vercel builds a preview deployment for every pull request.
- The Neon integration creates a database branch for each preview, so previews never touch production data.

### On merge to `main`
1. The same checks run again on the merged code.
2. A GitHub Actions job applies pending migrations to the production database with `drizzle-kit migrate`.
3. Only after migrations succeed, the job deploys to Vercel production with the Vercel CLI. Vercel's automatic production deploys from Git are disabled, so the order is guaranteed.

### Repository rules
- `main` is protected: no direct pushes, all checks required, linear history (rebase merges only).
- Pull requests merge automatically once checks and the dual review pass (see [0006](0006-agent-driven-delivery-workflow.md)), except UI changes outside the approved designs (see [0015](0015-approved-screen-designs.md)).
- Renovate opens grouped dependency update pull requests; secret scanning and push protection are enabled.

### Secrets
- Production and preview secrets (database URLs, Better Auth secret, Google OAuth client) live in Vercel and GitHub Actions secrets, entered by the owner.

## Alternatives considered
- Integration tests against a Neon branch per pull request, as first planned in [0008](0008-engineering-practices.md): realistic, but slower and dependent on an external service in every CI run. A local Postgres container gives the same engine with faster, isolated runs; Neon branches remain for previews.
- Letting Vercel deploy production straight from Git: simpler, but cannot guarantee migrations run first.
- Running migrations inside the Vercel build: a failed migration would leave a half-deployed state and mixes build with database writes.

## Consequences
- CI needs no cloud credentials for pull requests; only the production deploy job holds production secrets.
- A failed migration stops the deploy and leaves production on the previous version.
- Migrations must be backward compatible with the running version for the short window between migrate and deploy.
