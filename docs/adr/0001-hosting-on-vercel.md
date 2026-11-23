# 0001. Host the application on Vercel

- Status: Accepted
- Date: 2026-11-23

## Context
The owner wants free hosting for a personal app. The preferred stack was .NET + React/Vite, but Vercel has no official .NET runtime: its serverless functions run Node.js, Python, Go and Ruby.

## Decision
Host both the frontend and the API on Vercel, on the free Hobby plan. The API runs as serverless functions.

## Alternatives considered
- React on Vercel and a .NET API on Render: keeps .NET, but the free instance sleeps after inactivity and cold starts are slow; two deploy targets to maintain.
- .NET API on Azure App Service F1: very limited CPU quota and no custom domain.
- Railway or Fly.io: no lasting free tier.

## Consequences
- The backend must be TypeScript (see [0002](0002-typescript-api-with-hono.md)).
- The Hobby plan allows non-commercial use only. Commercial use requires the Pro plan (see [BD-0001](../business/BD-0001-personal-non-commercial-use.md)).
- Serverless limits apply: per-request execution timeout, no long-running processes, no in-memory or on-disk state between requests, possible cold starts.
- Every pull request gets a preview deployment.
