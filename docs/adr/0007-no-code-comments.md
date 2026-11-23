# 0007. No code comments

- Status: Accepted
- Date: 2026-11-23

## Context
The owner wants code that explains itself through naming and structure, with decisions documented in ADRs and business records instead of inline comments.

## Decision
Source code contains no comments. The only allowed forms are:
- Arrange / Act / Assert markers in tests.
- Method documentation of at most two lines of description.

There are no standing exceptions. If a tool directive written as a comment (for example `@ts-expect-error` or `biome-ignore`) seems necessary, the owner is asked first, case by case.

## Alternatives considered
- Allowing tool directives with a required reason: rejected by the owner, who prefers no exceptions to the rule.

## Consequences
- Intent must be carried by names, small functions and tests.
- The "why" behind non-obvious code lives in ADRs and business decisions.
- Lint rules should be configured so that suppression directives are rarely needed.
