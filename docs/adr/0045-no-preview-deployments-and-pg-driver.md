# 0045. Previews out of the delivery flow and the pg driver for Neon

- Status: Accepted
- Date: 2026-11-23
- Supersedes: the preview rule of [0001](0001-hosting-on-vercel.md), the preview deployments and preview database branches of [0018](0018-ci-cd-pipeline.md), and the serverless driver of [0003](0003-postgres-on-neon-with-drizzle.md)

## Context
Three accepted records describe a state the project no longer has. [0001](0001-hosting-on-vercel.md) and [0018](0018-ci-cd-pipeline.md) plan a preview deployment and a Neon database branch for every pull request. [0035](0035-no-ui-previews.md) removed previews, so the rule no longer applies. [0003](0003-postgres-on-neon-with-drizzle.md) names Neon's serverless driver, but the code connects through the `pg` Pool in `packages/db/src/client.ts`.

## Decision
- Preview deployments are not part of the delivery flow: nobody reviews or approves them ([0035](0035-no-ui-previews.md)), and pull requests get no Neon preview branch. Whether Vercel keeps building preview deployments is a project setting the owner decides separately.
- The database is Neon Postgres, reached through a `pg` `Pool` created from the connection string, with Drizzle on top. Neon's serverless driver is not used.
- The rest of each superseded record still holds: Vercel hosts the application, Neon hosts the database, and Drizzle manages the schema.

## Alternatives considered
- Keep the old records and mark them with a note: leaves three accepted records that contradict the code and the rules, which is the problem this record fixes.
- Edit the old records in place: not allowed by the decision log rules; each accepted decision is superseded by a new record.
- Switch the code to Neon's serverless driver so that [0003](0003-postgres-on-neon-with-drizzle.md) holds: adds a second driver path for no measured gain; rejected for now.

## Consequences
- The decision log matches the code and the delivery rules.
- Integration tests keep running against a local Postgres, as [0018](0018-ci-cd-pipeline.md) already allows.
- If the project moves to Neon's serverless driver later, a new record supersedes this one.
