# BD-0010. Category icons

- Status: Accepted
- Date: 2026-11-23

## Context
Users scan their movements quickly on the phone. A category name alone is slower to recognize than a symbol.

## Decision
- Every category has an icon so it can be recognized at a glance.
- Default categories come with an icon already assigned.
- When creating or editing a category, the user can pick an icon from the app's icon set.
- If a category has no icon, its badge shows the first letter of its name.

## Why
Icons make lists and pickers faster to read, and the letter fallback keeps every category recognizable even without one.

## Consequences
- The icon set and its technical source are decided in [ADR 0012](../adr/0012-category-icons-with-lucide.md).
- The category badge in [DESIGN.md](../../DESIGN.md) shows the icon, or the first letter as fallback, in white on the category color.
