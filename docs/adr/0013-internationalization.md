# 0013. Internationalization

- Status: Accepted
- Date: 2026-11-23

## Context
The app ships in Spanish and English, with Spanish as default (see [BD-0019](../business/BD-0019-spanish-and-english.md)). Code and documentation are written in English (see [0009](0009-language-policy.md)).

## Decision
- The frontend uses **react-i18next** with one translation file per language: `es` (default) and `en`.
- Translation keys are English and describe the meaning, for example `movement.save` or `balance.total`.
- Dates, numbers and money are formatted with the platform `Intl` APIs using the selected locale: `es-AR` and `en-US`.
- The API never returns user-facing text. Errors carry stable codes, and the frontend translates them.
- Default categories, groups and catalog accounts store a translation key. When a user renames one, the stored custom name replaces the key.
- The user's language is stored in their profile, so it follows them across devices.
- A test fails when a key exists in one language file and not in the other.

## Alternatives considered
- Lingui: smaller runtime and compile-time extraction, but a smaller ecosystem and less common in React projects.
- FormatJS (react-intl): solid ICU support, but more verbose for this app's needs.
- Spanish-only strings with translation later: cheaper now, but every screen would need rework.

## Consequences
- Components use translation keys only; a hardcoded user-facing string is a review failure.
- Adding a language means adding one file and passing the missing-key test.
