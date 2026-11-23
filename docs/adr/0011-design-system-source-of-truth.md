# 0011. Design system source of truth

- Status: Accepted
- Date: 2026-11-23

## Context
The visual identity was agreed through published mockups (see [BD-0007](../business/BD-0007-visual-direction-transit-signage.md) and [BD-0008](../business/BD-0008-graphite-palette-with-dark-theme.md)). Agents need one place to read it before building any screen.

## Decision
- `DESIGN.md` at the repository root is the human-readable design system: direction, principles, tokens, typography, components, logo usage and accessibility rules.
- `design/tokens.json` holds the same tokens in the Design Tokens Community Group format, with a light and a dark theme. The web app generates its CSS custom properties from it.
- `design/brand/` holds the logo and icon sources as SVG. PNG icons for the PWA manifest and Apple touch icon are generated from these SVGs at build time and are not committed.
- Category colors must reach at least 4.5 : 1 against their white letter and at least 3 : 1 against the dark surface.
- Fonts (Schibsted Grotesk, Public Sans) are self-hosted with the app.

## Alternatives considered
- Tokens only in CSS: simpler at first, but other tools and agents cannot read them reliably.
- Committing generated PNG icons: two sources of truth that drift apart when the logo changes.
- Loading fonts from Google Fonts at runtime: an extra third-party request and a privacy leak for every user.

## Consequences
- A change to colors or type is made in `DESIGN.md` and `design/tokens.json` together, in the same commit.
- The web app needs a small build step that turns tokens into CSS variables and SVGs into PNG icons.
