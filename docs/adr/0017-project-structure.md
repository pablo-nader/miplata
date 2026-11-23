# 0017. Project structure

- Status: Accepted
- Date: 2026-11-23

## Context
The app has a React + Vite PWA and a Hono API, sharing types and validation (see [0002](0002-typescript-api-with-hono.md)), in a pnpm monorepo (see [0008](0008-engineering-practices.md)). The structure must make the business domain visible and keep business rules independent from frameworks.

## Decision

### Layout
```
apps/
  web/        React + Vite PWA
  api/        Hono API
packages/
  shared/     Zod schemas, API contract types, money and date utilities
  db/         Drizzle schema, migrations and seed data
design/       tokens and brand sources (see ADR 0011)
docs/         ADRs, business decisions, architecture
```

### API: screaming and hexagonal
The top-level folders are the business features, not technical layers:
```
apps/api/src/
  accounts/  categories/  movements/  statements/
  recurring/  budgets/  reports/  people/
  shared/    auth, errors, http, database
```
Each feature has the same inner layers:
- `domain/`: entities, value objects and rules (for example, installment splitting or statement assignment). Pure TypeScript, no framework or database imports.
- `application/`: use cases that orchestrate the domain through ports (interfaces).
- `infrastructure/`: adapters that implement the ports with Drizzle.
- `http/`: Hono routes that validate input with the shared Zod schemas and call use cases.

Dependencies point inwards: `http` and `infrastructure` depend on `application`, which depends on `domain`.

### Web: features with container and presentational components
```
apps/web/src/
  features/   home/  movements/  accounts/  statements/  reports/  recurring/  settings/
  ui/         atoms/  molecules/  organisms/
  app/        routing, providers, PWA, i18n
```
- Each feature has containers (data fetching through the Hono RPC client and state) and presentational components (props in, UI out).
- `ui/` holds the design system components in atomic design levels, built only from tokens.

### Deployment shape
- One Vercel project serves the web app as static files and the API as a serverless function under `/api`.
- Same origin for web and API: no CORS configuration, and Better Auth session cookies stay first-party.

### Tooling
- Node.js 24 LTS and pnpm workspaces.
- TypeScript `strict` everywhere.
- Biome for lint and formatting, Vitest for unit and integration tests, Playwright for end-to-end tests.
- Lefthook runs format, lint and commitlint before commits.

## Alternatives considered
- Separate Vercel projects for web and API: independent deploys, but cross-origin cookies and CORS add friction for no benefit at this size.
- Technical top-level folders (`controllers/`, `services/`, `repositories/`): hide the domain and spread each feature across the tree.
- Turborepo or Nx: useful caching for large monorepos, unnecessary for two apps and two packages; pnpm workspace scripts are enough.

## Consequences
- Business rules are unit tested without a database or HTTP.
- A new feature is a new folder with the same four layers.
- The import direction is enforced with a lint rule, so the domain cannot import infrastructure.
