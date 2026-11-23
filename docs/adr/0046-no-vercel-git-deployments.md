# 0046. No Vercel Git deployments

- Status: Accepted
- Date: 2026-11-23
- Amends: [0045](0045-no-preview-deployments-and-pg-driver.md), which left the preview build setting to the owner

## Context
Previews are out of the delivery flow (see [0035](0035-no-ui-previews.md) and [0045](0045-no-preview-deployments-and-pg-driver.md)), yet Vercel still built a preview deployment for every pull request through its Git integration. Nobody looked at them; they used build minutes of the Hobby plan and added bot comments to every pull request. Production was already deployed only by the main workflow with the Vercel CLI (see [0018](0018-ci-cd-pipeline.md)).

## Decision
`vercel.json` sets `git.deploymentEnabled` to `false`, so Vercel creates no deployment from Git pushes on any branch. The main workflow keeps deploying production with the Vercel CLI after migrations, unchanged.

## Alternatives considered
- Keep preview builds: free to keep and occasionally handy, but unused and noisy. Rejected by the owner.
- Disable previews only for pull request branches with a pattern: same effect with more configuration, since `main` was already disabled.

## Consequences
- Pull requests get no Vercel preview URL or Vercel bot comments.
- Production deployments are unaffected: they never came from the Git integration.
