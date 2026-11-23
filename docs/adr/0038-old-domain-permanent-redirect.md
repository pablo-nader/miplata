# 0038. Permanent redirect from miplata-beta.vercel.app

- Status: Accepted
- Date: 2026-11-23
- Completes: the transition described in [0028](0028-custom-domain.md)

## Context
[0028](0028-custom-domain.md) made `https://miplata.enargentina.online` the production origin and kept `miplata-beta.vercel.app` working during the transition, to be redirected later. Per [0028](0028-custom-domain.md), Google sign-in stops working on the old origin once `BETTER_AUTH_URL` points to the new one, so old links and bookmarks must reach the new domain.

## Decision
- Every request to host `miplata-beta.vercel.app` gets a permanent redirect (308) to the same path and query on `https://miplata.enargentina.online`.
- The rule lives in `vercel.json` under `redirects`, conditioned on the host with `has: [{ "type": "host", "value": "^miplata-beta\\.vercel\\.app$" }]`. Vercel processes redirects before rewrites, so the rule runs before the SPA and API rewrites.
- Requests on `miplata.enargentina.online`, preview URLs and localhost do not match the host condition and are not redirected.

## Alternatives considered
- Redirect in the Vercel dashboard (domain settings): works, but is configured outside the repository and is not reviewed or versioned.
- A 307 or 302 redirect: the move is permanent, so browsers and search engines should learn the new address. Rejected.
- A serverless function that returns the redirect: more code to maintain for a static rule. Rejected.

## Consequences
- Old links and bookmarks keep working and land on the new origin.
- The redirect cannot be tested locally: Vercel evaluates `has` conditions only when deployed, so it is verified against production with `curl`:
  - `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://miplata-beta.vercel.app/privacy?ref=test'` returns `308 https://miplata.enargentina.online/privacy?ref=test`.
  - `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://miplata.enargentina.online/api/health'` returns `200` with an empty redirect URL.
- The old host stays attached to the project. Removing it later is a separate decision.
