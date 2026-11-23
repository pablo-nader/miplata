# Agent working rules

Rules for every agent working in this repository. Background and reasons live in [docs/adr](docs/adr/README.md) and [docs/business](docs/business/README.md).

## Stack
React + Vite, Hono, Drizzle, Neon Postgres, Better Auth with Google, Vercel. All TypeScript. See ADRs 0001 to 0004.

## Design
Read [DESIGN.md](DESIGN.md) before building or changing any screen. Use only the tokens in `design/tokens.json`; never literal colors. Logo and icon sources live in `design/brand/`. See ADR 0011.

## Code
- No code comments. Only Arrange / Act / Assert markers in tests and method docs of at most two lines. No standing exceptions: ask the owner before any comment-style tool directive (`@ts-expect-error`, `biome-ignore`, ...). See ADR 0007.
- Every user-owned table has `user_id`. Repositories require `userId`. The user id comes only from the server-side session. See ADR 0005.
- All code and documentation are always in English. Conversations with the owner are always in Spanish. See ADR 0009.
- No hardcoded user-facing text: every string comes from the `es` and `en` translation files, and both must have every key. See ADR 0013.

## Delivery
1. Work on a branch, never directly on `main`.
2. Every behavior change ships with its tests, including a data-isolation test for each endpoint.
3. Before opening a pull request, two fresh agents with no prior context review the change. Open the pull request only when both pass with no warnings.
4. All CI checks must pass. Fix CI failures and merge conflicts.
5. Rebase onto `main` instead of merging, to keep history linear.
6. Merge to `main` is automatic once CI and the dual review pass; it deploys to production. No previews: never prepare one or ask the owner to approve one, for any pull request. The approved mockups (`design/mockups/screens.html`) and `DESIGN.md` stay the design reference for reviewers. See ADR 0035.
7. Conventional Commits with the AI co-author trailer. Pull request descriptions end with an AI attribution line.

## Decisions
- Record every technical decision as an ADR in `docs/adr/`.
- Record every business decision in `docs/business/`, including why it was taken.
- Never edit an accepted decision: supersede it with a new record.

## Boundaries
- Never create accounts or handle credentials or secrets. The owner creates accounts and enters secrets in GitHub and Vercel.

## Stages
- Each implementation stage runs as its own session and delivers its own pull request.
- Stages with no pending dependencies run in parallel.
- Each stage uses the cheapest model that can do the work.
- The assistant turns on auto-merge and Auto-fix on its own pull requests and merges them once CI is green, never leaving the merge to the owner.
