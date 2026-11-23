# BD-0008. Graphite palette with light and dark themes

- Status: Accepted
- Date: 2026-11-23

## Context
Five palettes were built on the transit signage direction (see [BD-0007](BD-0007-visual-direction-transit-signage.md)): Subte, Cielo, Bosque, Grafito and Ciruela.

## Decision
The app uses the Grafito palette: charcoal signage band, signal orange for the main action, teal and orange as the income and expense rules, and a green for income amounts. The app ships both a light and a dark theme, following the device setting.

## Why
The owner preferred the most sober and modern option. Charcoal and signal orange keep high contrast, and the neutral base lets category colors carry meaning. A dark theme is expected in a phone app used at any hour.

## Alternatives considered
- Subte (navy and yellow), Cielo (sky blue and sun yellow), Bosque (deep green and mint), Ciruela (plum and lime).

## Consequences
- Orange is reserved for the main action and the expense rule; it is never used to flag expenses as alarming.
- Every color is defined as a design token with a light and a dark value.
