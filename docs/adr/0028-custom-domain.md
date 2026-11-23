# 0028. Custom domain: miplata.enargentina.online

- Status: Accepted
- Date: 2026-11-23
- Amends: the production origin named in [0027](0027-better-auth-integration.md)

## Context
The owner bought `enargentina.online` in Vercel (team `ways`, Vercel DNS) to host each of their apps on a subdomain. miPlata was served from the generated domain `miplata-beta.vercel.app`.

## Decision
- miPlata's production origin is **`https://miplata.enargentina.online`**. Host names are case-insensitive, so the brand name is written in lowercase.
- The domain is attached to the Vercel project `miplata` in the same team, so it needs no verification record.
- `BETTER_AUTH_URL` in production is `https://miplata.enargentina.online`.
- The Google OAuth client `miplata-web` allows the new origin and its callback `https://miplata.enargentina.online/api/auth/callback/google`. The Google branding (home page, privacy policy, terms) points to the new domain, and `enargentina.online` is an authorized domain.
- `miplata-beta.vercel.app` keeps working during the transition and will later redirect to the new domain.

## Alternatives considered
- Keeping `miplata-beta.vercel.app`: free and already working, but tied to a generated name and to Vercel's domain.

## Consequences
- Sessions and an installed PWA belong to one origin: users sign in again and reinstall the app on the new domain. Their data is unaffected, since it lives in the database.
- Google sign-in on the old domain stops working once `BETTER_AUTH_URL` points to the new one.
