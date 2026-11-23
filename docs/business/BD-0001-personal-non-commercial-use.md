# BD-0001. Personal, non-commercial use

- Status: Accepted
- Date: 2026-11-23

## Context
The app manages personal expenses. Its expected users are the owner, family and friends.

## Decision
The app is for personal use and is not monetized.

## Why
It solves the owner's own need, and keeping it non-commercial allows running it at zero cost.

## Consequences
- Vercel's free Hobby plan is allowed, since it is limited to non-commercial use (see [ADR 0001](../adr/0001-hosting-on-vercel.md)).
- If the app is ever monetized, hosting moves to a paid plan and this record must be superseded.
