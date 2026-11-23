# 0003. Postgres on Neon with Drizzle ORM

- Status: Superseded by [0045](0045-no-preview-deployments-and-pg-driver.md) (serverless driver)
- Date: 2026-11-23

## Context
The app needs a free, managed relational database that works well from serverless functions, where opening a new TCP connection per request is costly.

## Decision
Use Postgres hosted on Neon (free plan), accessed through Neon's serverless driver, with Drizzle as the ORM. Schema and migrations live in TypeScript and are managed with `drizzle-kit`.

## Alternatives considered
- Supabase: Postgres plus built-in auth, storage and realtime. More coupling to its platform, and free projects pause after about a week of inactivity and must be resumed manually.
- Turso (SQLite/libSQL): fast and light, but fewer types and features than Postgres.
- Prisma instead of Drizzle: heavier, uses its own schema language and abstracts SQL further.

## Consequences
- The database is a managed service; no server to maintain. Pick a region close to the Vercel functions.
- The free plan has a small storage quota (about 0.5 GB per project) and scales compute to zero, so the first request after idle has a short delay.
- Neon database branches allow an isolated database per pull request.
- Types flow from the Drizzle schema through the API to the frontend.
- Free-plan limits change over time and must be checked against Neon's pricing page.
