# 0004. Authentication with Better Auth and Google

- Status: Accepted
- Date: 2026-11-23

## Context
Neon provides only the database, so authentication must be solved separately. Users must sign in with their Google accounts (see [BD-0003](../business/BD-0003-google-sign-in.md)).

## Decision
Use Better Auth inside the Hono API, with Google as the sign-in provider. Users and sessions are stored in our own Postgres database through Drizzle.

## Alternatives considered
- Supabase Auth: ready in minutes, but ties authentication to Supabase and its inactivity pausing.
- Clerk or another hosted auth provider: less code, but user data lives in a third party and the free tier can change.

## Consequences
- All auth code and user data stay in this repository and database, at no cost.
- More initial setup than a hosted provider.
- A Google OAuth client must be created in Google Cloud Console by the owner. The OAuth consent screen must be published, because in "Testing" mode only manually added users can sign in. Basic scopes (email, profile) do not require Google verification.
