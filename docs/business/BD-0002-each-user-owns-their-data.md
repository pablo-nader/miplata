# BD-0002. Each user owns their data

- Status: Accepted
- Date: 2026-11-23

## Context
Several people (the owner, family and friends) will use the same app.

## Decision
Each person has their own account and sees and manages only their own data. No user can see another user's data.

## Why
Personal finances are private. Each user must be the owner of their information.

## Consequences
- Every record belongs to exactly one user.
- Isolation is a hard requirement, enforced and tested in the API (see [ADR 0005](../adr/0005-per-user-data-isolation.md)).
- Shared features between users (for example, shared expenses) are out of scope unless a new business decision introduces them.
