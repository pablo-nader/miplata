# 0026. Public pages and the landing route

- Status: Accepted
- Date: 2026-11-23
- Amends: [0024](0024-web-routing-and-ui-foundation.md)

## Context
[BD-0023](../business/BD-0023-public-google-sign-in-and-legal-pages.md) requires a public home page, privacy policy and terms. Google checks that the home page describes the app and links the privacy policy. Until now `/` was the signed-in home screen inside the app shell.

## Decision
- `/` is the public landing page: the approved sign-in screen plus a short description of the app and footer links. The signed-in home screen moves to `/home`.
- `/privacy` and `/terms` are static pages. All three public routes render in a layout with a single main landmark and a footer with links to both legal pages and a language switch.
- Legal text lives in the `es` and `en` translation files, as arrays of sections, so the missing-key test covers it. The public contact email is one constant in the code.
- The sign-in button links to the `/sign-in` placeholder until the authentication stage wires it. That stage also redirects signed-in visitors from `/` to `/home`.
- Unknown paths still redirect to `/`, now the landing page; the authentication stage sends signed-in visitors on to `/home`.
- The pages need no API and are served by the existing Vercel rewrite to `index.html`.
- The language switch changes the language for the current visit only; the stored profile language of [0013](0013-internationalization.md) applies once users can sign in.

## Alternatives considered
- Keeping the app home at `/` and serving the landing page elsewhere: Google needs the home page at the site root.
- Prerendering the pages to static HTML: better for crawlers without JavaScript, but adds a build step; revisit if Google cannot read the pages.

## Consequences
- Navigation, the back links on focused screens and the tests point to `/home` instead of `/`.
- Changing what the app collects requires updating the legal texts in both languages.
