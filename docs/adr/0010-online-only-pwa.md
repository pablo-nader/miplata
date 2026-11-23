# 0010. Online-only PWA

- Status: Accepted
- Date: 2026-11-23

## Context
The app is an installable PWA (see [BD-0004](../business/BD-0004-mobile-first-installable-app.md)). Supporting offline data entry needs a local store, a sync queue and conflict handling.

## Decision
Build the PWA with `vite-plugin-pwa`. The service worker caches the application shell only, so the app opens fast. Reading and writing data requires a network connection.

## Alternatives considered
- Offline data entry with background sync: more convenient without signal, but adds a local database, a sync queue, conflict resolution and their tests. Deferred.

## Consequences
- Simpler architecture and fewer failure modes.
- Users without connection see a clear offline state instead of a broken screen.
- Offline entry can be added later without rewriting the app, since the API contract does not change.
