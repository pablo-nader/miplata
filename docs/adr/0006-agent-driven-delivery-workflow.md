# 0006. Agent-driven delivery workflow

- Status: Accepted
- Date: 2026-11-23

## Context
The owner wants development run by AI agents end to end, and wants to trust what ships without reviewing every line.

## Decision
- The owner and Claude agree on functional requirements and architecture. Claude then implements, tests, opens pull requests and deploys.
- Before opening a pull request, two fresh agents with no prior context review the change independently. The pull request opens only when both pass with no warnings.
- Review and correction run for at most two rounds; if the reviewers still disagree, the decision is escalated to the owner.
- Pull requests must pass all CI checks. Claude fixes CI failures and merge conflicts.
- Branches are rebased onto `main` whenever possible to keep history linear.
- Merge to `main` is automatic once CI and the dual review pass. Merging to `main` deploys to production.
- Commits follow Conventional Commits and carry an AI co-author trailer. Pull request descriptions end with an AI attribution line.
- Every technical decision is recorded as an ADR and every business decision in `docs/business/`.

## Alternatives considered
- Owner approves every merge: more control, slower feedback. Rejected by the owner in favor of automatic merge.
- Unlimited review rounds until both reviewers are clean: risks an endless loop between reviewers.

## Consequences
- With automatic merge, CI is the only gate before production, so it must be strict from the first commit: type checking, lint, unit, integration and data-isolation tests, and migrations applied before deploy.
- `main` must be protected: no direct pushes, required checks, linear history.
- Accounts and secrets (GitHub, Vercel, Neon, Google Cloud) are created and entered by the owner; agents never create accounts or handle credentials.
