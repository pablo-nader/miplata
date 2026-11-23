# Architecture Decision Records

Each technical decision gets one file: `NNNN-short-title.md`, numbered in order and never renumbered. A decision that changes is not edited: a new ADR supersedes it and the old one's status is updated to point to it.

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
What problem or force drives this decision.

## Decision
What we chose.

## Alternatives considered
Each option and why it was not chosen.

## Consequences
What becomes easier, harder, or constrained.
```

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-hosting-on-vercel.md) | Host the application on Vercel | Accepted |
| [0002](0002-typescript-api-with-hono.md) | TypeScript API with Hono | Accepted |
| [0003](0003-postgres-on-neon-with-drizzle.md) | Postgres on Neon with Drizzle ORM | Accepted |
| [0004](0004-auth-with-better-auth-and-google.md) | Authentication with Better Auth and Google | Accepted |
| [0005](0005-per-user-data-isolation.md) | Per-user data isolation enforced in the API | Accepted |
| [0006](0006-agent-driven-delivery-workflow.md) | Agent-driven delivery workflow | Accepted |
| [0007](0007-no-code-comments.md) | No code comments | Accepted |
| [0008](0008-engineering-practices.md) | Engineering practices baseline | Proposed |
