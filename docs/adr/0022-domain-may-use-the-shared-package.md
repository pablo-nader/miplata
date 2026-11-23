# 0022. The domain may use the shared package

- Status: Accepted
- Date: 2026-11-23
- Refines: [0017](0017-project-structure.md)

## Context
[0017](0017-project-structure.md) keeps the API domain free of frameworks and enforces it with a lint rule. Business rules need calendar arithmetic (statement months, short months, leap years), money and exchange rounding. The web needs the same rules, so they live in `packages/shared`, which has no framework, database or HTTP code.

## Decision
- Code in `apps/api/src/<feature>/domain/` may import `@miplata/shared`. Every other npm package, Node core module and layer stays forbidden.
- Domain functions take and return plain values (integers of minor units, ISO date strings, `YYYY-MM` months) so they stay trivial to test.
- `packages/shared` must remain pure: no I/O, no clock, no random values, no framework.

## Alternatives considered
- Duplicating the calendar helpers inside each domain folder: avoids the new exception but forks rules the web must also follow.
- Importing shared sources through relative paths: bypasses the rule without changing its intent.

## Consequences
- The `domain-has-no-frameworks` rule in `.dependency-cruiser.json` excludes `@miplata/shared`.
- Money, rounding and calendar rules are written once and used by the API and the web.
