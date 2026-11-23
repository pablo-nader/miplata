# 0005. Per-user data isolation enforced in the API

- Status: Accepted
- Date: 2026-11-23

## Context
Each user owns their data and must see only their own records (see [BD-0002](../business/BD-0002-each-user-owns-their-data.md)). The frontend talks only to the Hono API, never to the database directly.

## Decision
Enforce isolation in the API:
- Every user-owned table has a `user_id` column.
- An auth middleware rejects requests without a valid session.
- Repository functions take `userId` as a required parameter, so a query without it does not compile.
- The user id always comes from the server-side session, never from the request body, query string or path.
- Every endpoint has a test proving that one user cannot read, update or delete another user's data.

## Alternatives considered
- Postgres Row Level Security (RLS): protects data when clients query the database directly. Our API connects with a server role, so RLS would not apply without extra session configuration, and the API filter is needed anyway.

## Consequences
- Isolation depends on the API layer, so the required `userId` parameter and the isolation tests are mandatory, not optional.
- Adding RLS later as defense in depth remains possible.
