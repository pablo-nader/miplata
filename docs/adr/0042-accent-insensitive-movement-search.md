# 0042. Accent-insensitive movement search

- Status: Accepted
- Date: 2026-11-23

## Context
[BD-0020](../business/BD-0020-search-and-filters.md) asked for search over descriptions, indexed in the database. The first version used `ilike` over a trigram index on the raw column, so "cafe" did not find "Café". [BD-0030](../business/BD-0030-search-ignores-accents-and-amounts-use-the-selected-currency.md) now requires searching without accents or case.

## Decision
- Migration `0002_accent_insensitive_search` enables the `unaccent` extension and creates `immutable_unaccent(text)`, a SQL function marked `IMMUTABLE PARALLEL SAFE STRICT` that calls `public.unaccent('public.unaccent'::regdictionary, input)`. `unaccent` itself is only `STABLE`, and the PostgreSQL docs require every function in an index expression to be immutable, so the wrapper pins the dictionary explicitly and is safe to index.
- The index `movement_description_search_idx` replaces `movement_description_trgm_idx`: a GIN index with `gin_trgm_ops` on `immutable_unaccent(lower(description))`.
- The list query compares `immutable_unaccent(lower(description)) like immutable_unaccent(lower('%text%'))`, with `%`, `_` and `\` in the text escaped. The expression is the same as the index, so the planner can use it.
- The amount-range filter now also requires the main posting to be in the selected currency, so a range in USD never matches pesos. Without a currency the web sends ARS together with the range.
- `drizzle-kit` drops the column inside the nested expression when it generates the index SQL, so the migration SQL is written by hand and the snapshot is the one the tool produced.

## Alternatives considered
- Normalizing in the application and storing a second column: duplicates data and needs backfills and write-path changes.
- A generated column with `unaccent`: generated columns need immutable expressions too, so it still needs the wrapper and adds storage.
- `unaccent` unwrapped inside the query: works but cannot use an expression index, so it scans.

## Consequences
- The `unaccent` extension must be available; it ships with PostgreSQL contrib and with Neon.
- Search ignores diacritics for every language, not only Spanish.
- Rebuilding the index on a very large table would lock writes; the data volume per user makes this acceptable for now.
