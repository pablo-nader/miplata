# 0025. Database schema implementation

- Status: Accepted
- Date: 2026-11-23

## Context
[ADR 0016](0016-data-model.md) and [docs/architecture/data-model.md](../architecture/data-model.md) define the data model. Implementing it in `packages/db` required a few technical choices that those documents leave open.

## Decision
- **All primary keys are `uuid`, including Better Auth's tables.** Better Auth must be configured with `advanced.database.generateId: "uuid"` when authentication is implemented, so `user.id` and every `user_id` column share one type. Tables default to `gen_random_uuid()`.
- **Better Auth table shapes** follow the current Better Auth core schema (`user`, `session`, `account`, `verification`) with `user.locale` added, and `account` stored as `auth_account`. Timestamps are `timestamptz`.
- **Text plus check constraints instead of Postgres enums** for types, currencies, frequencies and statuses. Adding a value is a plain constraint change, not an enum migration.
- **Month columns** (`installment.period_month`, `statement.period_month`) are `date` values on the first day of the month, enforced by a check.
- **Every user-owned table that others reference has `unique (user_id, id)`**, the target of the composite foreign keys. Nullable composite foreign keys (for example `movement.statement_id`) are not enforced while the reference is null, which is intended.
- **Delete rules.** `RESTRICT` for categories, groups with categories, accounts, statements and for the movement and occurrence references. `CASCADE` for postings, installments, account currencies, occurrences of a recurring, and budgets whose category or group is deleted. `user_id` references `user` with `CASCADE`.
- **The movement and the recurring occurrence reference each other**, one to one: both links are unique where set. Both foreign keys are `RESTRICT`, so one reference must be cleared before deleting either row.
- **Names are unique per user.** Default keys through `(user_id, name_key)`; custom category names per user and type, custom group names per user (BD-0009). Account custom names are not unique.
- **Additional checks beyond the data model:** a statement is unique per card and month, an installment number is unique per movement and at least 1, a recurring has day 1 to 31, a month only when yearly, a positive amount when fixed and an end date not before its start, an occurrence is `confirmed` exactly when it has a movement, a budget limit is positive, closing and due days exist only on credit cards, `installment.own_amount_minor` is between 0 and `amount_minor`, and a statement is not due before it closes.
- **Not enforced by the database, left to the API and its tests:** that a statement belongs to a `credit_card` account, that a posting currency is one the account holds, that every income or expense has an installment, that `movement.type` and `recurring.type` match the type of their category, that budgets target expense categories or groups, and that `movement.recurring_occurrence_id` and `recurring_occurrence.movement_id` point at each other (each side is only unique on its own).
- **Default keys are unique per user** through partial unique indexes on `(user_id, name_key)` where `name_key` is not null, which makes seeding idempotent and safe under concurrency with `ON CONFLICT DO NOTHING`.
- **The institution catalog is loaded by the migration** (`INSERT ... ON CONFLICT DO NOTHING`), so production needs no separate seed step. A test keeps it equal to `INSTITUTION_CATALOG`.
- **Per-user defaults** are created by `seedUserDefaults(db, userId)`, called by the authentication stage once, when a user is created. Running it later recreates a default the user renamed, because only `name_key` rows are protected by the unique index. Names are translation keys under `defaults.*`; the web translation files must define them. The default Cash account holds both `ARS` and `USD` at a zero opening balance.
- **Extra indexes** on foreign keys used by restrict checks and lookups: `movement (user_id, category_id)`, `posting (user_id, movement_id)` and the Better Auth user indexes.
- **`pg_trgm`** is enabled at the top of the first migration for the trigram index on `movement.description`.
- **Integration tests create a throwaway database per test file**, apply the committed migrations to it, and drop it afterwards, so they prove migrations work from scratch and run in parallel without sharing rows.
- **Lucide icon names** in the defaults are validated against the installed `lucide` package in a unit test, as [ADR 0012](0012-category-icons-with-lucide.md) requires.

## Alternatives considered
- Postgres enums: stricter types, but each new value needs an `ALTER TYPE` migration.
- Text ids for Better Auth: the library default, but it forces `text` foreign keys across the whole schema.
- `NO ACTION` instead of `RESTRICT`: checked at the end of the statement, so it cannot fail on cascade order, but the data model explicitly asks for `RESTRICT`.

## Consequences
- Deleting a user cascades through every user-owned table, including rows protected by `RESTRICT`, and a test with movements, postings, installments, statements and recurring data confirms it succeeds with the current constraint order. This relies on Postgres firing the cascades before the `RESTRICT` checks; if a future table breaks it, switch those rules to `NO ACTION`, which still rejects deleting a used category or account.
- The authentication stage must set `generateId: "uuid"` and map `account` to `auth_account`.
- The web translation files need the `defaults.*` keys used by the seed.
