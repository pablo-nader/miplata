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
| [0008](0008-engineering-practices.md) | Engineering practices baseline | Accepted |
| [0009](0009-language-policy.md) | Language policy | Accepted |
| [0010](0010-online-only-pwa.md) | Online-only PWA | Accepted |
| [0011](0011-design-system-source-of-truth.md) | Design system source of truth | Accepted |
| [0012](0012-category-icons-with-lucide.md) | Category icons with Lucide | Accepted |
| [0013](0013-internationalization.md) | Internationalization | Accepted |
| [0014](0014-ui-preview-approval.md) | UI preview approval before merge | Accepted |
| [0015](0015-approved-screen-designs.md) | Approved screen designs | Accepted |
| [0016](0016-data-model.md) | Data model | Accepted |
| [0017](0017-project-structure.md) | Project structure | Accepted |
| [0018](0018-ci-cd-pipeline.md) | CI/CD pipeline | Accepted |
| [0019](0019-hosting-region.md) | Hosting region: São Paulo | Accepted |
| [0020](0020-brand-name-is-not-translated.md) | The brand name is not translated | Accepted |
| [0021](0021-serverless-packaging-and-quality-gates.md) | Serverless packaging and quality gates | Accepted |
| [0022](0022-domain-may-use-the-shared-package.md) | The domain may use the shared package | Accepted |
| [0023](0023-money-as-safe-integers-in-the-domain.md) | Money as safe integers in the domain | Accepted |
| [0024](0024-web-routing-and-ui-foundation.md) | Web routing and UI foundation | Accepted |
| [0025](0025-database-schema-implementation.md) | Database schema implementation | Accepted |
| [0026](0026-public-pages-and-landing-route.md) | Public pages and the landing route | Accepted |
| [0027](0027-better-auth-integration.md) | Better Auth integration | Accepted |
| [0028](0028-custom-domain.md) | Custom domain: miplata.enargentina.online | Accepted |
| [0029](0029-categories-api-and-screen.md) | Categories API and screen | Accepted |
| [0030](0030-accounts-and-people-api.md) | Accounts and people API | Accepted |
| [0031](0031-movements-api.md) | Movements API | Accepted |
| [0032](0032-reports-api.md) | Reports API | Accepted |
| [0033](0033-statements-api.md) | Statements API | Accepted |
| [0034](0034-recurring-movements-api.md) | Recurring movements API | Accepted |
