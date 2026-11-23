# BD-0004. Mobile-first, installable app

- Status: Accepted
- Date: 2026-11-23

## Context
Expenses happen throughout the day, so users need to record them from their phones at the moment they spend. They also want to review their data comfortably on a computer or tablet.

## Decision
- The app is designed mobile first and adapts to tablet and desktop screens.
- The app is a Progressive Web App (PWA) that users can install on their phones.

## Why
Recording an expense must be fast from the phone, or users forget to do it. Installing it as a PWA gives an app-like experience without publishing to app stores.

## Consequences
- Every screen is designed for small screens first, then expanded for larger ones.
- No App Store or Play Store publishing, fees or review process.
- On iOS, installation is manual through Share, then "Add to Home Screen"; there is no automatic install prompt.
- The app works online only (see [ADR 0010](../adr/0010-online-only-pwa.md)).
