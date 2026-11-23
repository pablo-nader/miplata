# BD-0030. Search ignores accents and amounts use the selected currency

- Status: Accepted
- Date: 2026-11-23

## Context
[BD-0020](BD-0020-search-and-filters.md) defined search and filters. A final audit found gaps in how they behave.

## Decision
- Text search ignores accents and letter case: "cafe" finds "Café" and the other way around.
- The amount range applies in the selected currency (ARS or USD) and its inputs are labelled with that currency. With no currency selected, the range is in pesos.
- The searched text appears as a removable chip next to the other active filters.
- "Limpiar todo" is one tap from the movements screen whenever any filter or search is active, and clears the search and every filter.

## Why
People type descriptions without accents on a phone keyboard, and a range of 100 means something different in dollars. Showing and clearing what is active should never need extra taps.

## Consequences
- This refines BD-0020 without replacing it. The technical approach is in [ADR 0042](../adr/0042-accent-insensitive-movement-search.md).
