# 0019. Hosting region: São Paulo

- Status: Accepted
- Date: 2026-11-23

## Context
All users are in Argentina. Every API request queries the database, so the latency between the user, the Vercel function and the Neon database adds up on each screen.

## Decision
- The Neon project `miplata` runs in **AWS South America East 1 (São Paulo)**, `aws-sa-east-1`, on Postgres 17. The production branch is `main`, with database `miplata` and owner role `miplata_owner`.
- Vercel functions run in **São Paulo (`gru1`)**, set through the `regions` option in the Vercel configuration. The Hobby plan allows selecting any single region.

## Alternatives considered
- Vercel's default region, Washington D.C. (`iad1`), with Neon in US East: each round trip from Argentina takes roughly 100 ms longer than to São Paulo (approximate, not measured).
- Functions in São Paulo with the database in the United States: each query would cross the continent several times per request.

## Consequences
- Function and database share a region, so queries stay fast.
- If the Neon free plan or Vercel Hobby ever stop offering São Paulo, this record must be revisited.
