# 0020. The brand name is not translated

- Status: Accepted
- Date: 2026-11-23

## Context
Every user-facing string comes from the translation files (see [0013](0013-internationalization.md)). The app name "miPlata" is a brand, identical in Spanish and English, and it is also needed outside the React tree: the HTML title and the web app manifest.

## Decision
- The brand name "miPlata" is the same in every language. The UI reads it from the `app.name` key like any other string, so a future change still goes through the translation files.
- The static HTML title and the web app manifest `name` and `short_name` carry the literal brand name, because they are produced at build time before any language is chosen.

## Alternatives considered
- Generating the manifest and title from the translation files at build time: removes the duplicate literal, but the manifest can hold only one language, so it would still be a single fixed value.

## Consequences
- Renaming the brand means changing the translation files, `index.html` and the manifest in `vite.config.ts` together.
