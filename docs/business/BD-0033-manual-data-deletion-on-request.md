# BD-0033. Manual deletion of a user's data on request

- Status: Accepted
- Date: 2026-11-23
- Related: [BD-0002](BD-0002-each-user-owns-their-data.md), [BD-0023](BD-0023-public-google-sign-in-and-legal-pages.md)

## Context
[BD-0023](BD-0023-public-google-sign-in-and-legal-pages.md) publishes a privacy policy that tells users they can ask for their account and records to be deleted by writing to the contact email. It did not say how that request is handled or how long it takes.

## Decision
- A user asks for deletion by email from the address they sign in with.
- The owner checks that the requester is the account holder (the email matches the `user` row) before deleting anything.
- The owner deletes the user's rows within 30 days of the request, following the runbook in [docs/runbooks/user-data-deletion.md](../runbooks/user-data-deletion.md). The rows are removed in one transaction, in a fixed order that respects the foreign keys.
- When the deletion is complete, the owner confirms it to the requester by email.
- The deletion is a manual SQL procedure run by the owner. It is never executed by application code, a scheduled job or a migration.
- There is no in-app deletion. The public privacy page keeps the same promise, with the 30-day deadline.

## Why
The app has a small number of deletion requests, all from people the owner can identify. A manual, documented procedure is enough, and it avoids building an in-app deletion path that would need its own tests, confirmations and safeguards. The 30-day deadline gives the owner time and gives users a clear expectation.

## Consequences
- The owner must track each request until the confirmation email is sent. The deadline is 30 days from the request.
- The procedure removes data from the live database. Retention of Neon's database history is governed by the Neon plan and is not changed by this decision.
- Adding a table that holds user data requires adding it to the runbook in the same pull request, because the runbook is the only deletion path.
- When in-app deletion is built, this record is superseded by a new one.
