# 0035. No UI previews: every pull request merges on green CI

- Status: Accepted
- Date: 2026-11-23
- Supersedes: [0014](0014-ui-preview-approval.md) and the preview rule of [0015](0015-approved-screen-designs.md)

## Context
Pull requests with user interface outside the approved mockups waited for the owner to approve a preview before merging. In practice this blocked several parallel stages on the owner's availability.

## Decision
- No previews are prepared or requested, for any pull request.
- Every pull request, with or without user interface, merges automatically once CI and the dual blind review pass, and the merge deploys to production.
- The approved mockups in `design/mockups/screens.html` and `DESIGN.md` remain the design reference that reviewers check against.

## Alternatives considered
- Keeping previews only for new screens: catches visual surprises before production, but kept blocking delivery. Rejected by the owner.

## Consequences
- Visual issues are found in production and fixed in a follow-up pull request.
- The dual blind review and the end-to-end tests carry more weight for user interface quality.
