# 0002. TypeScript API with Hono

- Status: Accepted
- Date: 2026-11-23

## Context
The API must run on Vercel serverless functions (see [0001](0001-hosting-on-vercel.md)). The frontend stays on React + Vite. The owner comes from C# and values strong typing.

## Decision
Build the API with Hono in TypeScript. The frontend consumes it through Hono's RPC client (`hc`), sharing the API types without code generation.

## Alternatives considered
- Express: works, but it was designed for long-running servers, has weak TypeScript typing and a legacy middleware ecosystem.
- Next.js: strong Vercel fit, but it replaces Vite as the frontend and adds SSR and Server Components, which an expense app does not need.

## Consequences
- One language across the whole stack.
- End-to-end types: a breaking API change fails type checking in the frontend.
- The API stays portable: Hono also runs on Node, Bun, Deno and Cloudflare without code changes.
