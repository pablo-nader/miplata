# BD-0019. Spanish and English

- Status: Accepted
- Date: 2026-11-23

## Context
The app's users speak Spanish, but supporting a second language later is far more expensive than designing for it from the start.

## Decision
- The app is available in **Spanish** and **English** from the first version.
- **Spanish is the default** for every new user. Each user can switch language in their settings.
- Dates, numbers and money are formatted according to the selected language.
- Default category, group and account names are shown in the user's language until the user renames them; a renamed item keeps the user's text in every language.

## Why
Spanish matches the current users. Adding English now keeps every screen ready for it, avoiding a costly rework later.

## Consequences
- No user-facing text is hardcoded in components; every text comes from translation files.
- Every screen and message must exist in both languages before it ships.
- Technical approach in [ADR 0013](../adr/0013-internationalization.md).
