# BD-0003. Sign in with Google

- Status: Accepted
- Date: 2026-11-23

## Context
Users are people close to the owner who already have Google (Gmail) accounts.

## Decision
Users sign in with their Google account.

## Why
No new password to create or remember, and no password storage to protect on our side.

## Consequences
- Implemented with Better Auth and a Google OAuth client (see [ADR 0004](../adr/0004-auth-with-better-auth-and-google.md)).
- Users without a Google account cannot sign in unless another method is added later.
