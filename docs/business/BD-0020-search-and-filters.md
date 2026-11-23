# BD-0020. Search and filters

- Status: Accepted
- Date: 2026-11-23

## Context
As movements accumulate, users need to find specific ones quickly ("how much did I pay for the plumber?").

## Decision
- The movements list has a **text search** over descriptions.
- The list can be **filtered** by period, movement type, account, group, category, person, currency and amount range. Filters can be combined with the search.
- Active filters are visible and can be cleared in one tap.
- **Attaching photos of receipts is out of scope** for now.

## Why
Search and filters cover the common lookups without adding complexity to recording. Receipt photos would need file storage and are not needed yet.

## Consequences
- Descriptions should be indexed for search in the database.
- A future decision is needed before adding receipt photos.
