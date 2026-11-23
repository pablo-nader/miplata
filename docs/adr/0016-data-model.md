# 0016. Data model

- Status: Accepted
- Date: 2026-11-23

## Context
The business decisions (BD-0002 and BD-0009 to BD-0021) require multiple currencies per account, transfers and exchanges, card installments counted per statement, loans and purchases for others, recurring movements, budgets and strict per-user isolation. The full schema is in [docs/architecture/data-model.md](../architecture/data-model.md).

## Decision
- **Postings and installments are separate.** A movement has postings, which change account balances when the money moves, and installments, which say when and how much counts as income or expense. A card purchase moves the card balance once, on the purchase date, and is recognized as expense installment by installment.
- **People are accounts** of type `person`, so loans reuse postings, currencies and balances.
- **Balances are calculated, not stored**, from opening balances and postings. At the expected scale (a few users, thousands of movements each) this is fast and cannot drift.
- **Composite foreign keys `(user_id, id)`** between user-owned tables make the database reject cross-user references, as a second line of defense behind the API (see [0005](0005-per-user-data-isolation.md)).
- **Money is `bigint` minor units** with an explicit `currency`.
- **`ON DELETE RESTRICT`** protects categories, accounts and people that have movements; the app deactivates them instead.
- **Default names are translation keys** (`name_key`); a custom `name` replaces them (see [0013](0013-internationalization.md)).
- **Better Auth's `account` table is renamed to `auth_account`**, so `account` is free for money accounts. Renaming is done through Better Auth's model name option and is verified when authentication is implemented.
- **Recurring occurrences are created when due**, with a unique key on `(recurring_id, due_on)` so generation is idempotent and needs no scheduled job.

## Alternatives considered
- **Full double-entry bookkeeping** with income and expense accounts: rigorous, but heavier to query and explain, and installments still need their own schedule.
- **A single movements table** with nullable columns for every case: simpler at first, but transfers, exchanges and installments become special cases scattered through the code.
- **Stored balances updated on every write**: faster reads, but can drift from the movements and needs reconciliation.
- **A separate people table**: duplicates the balance and currency logic accounts already have.

## Consequences
- Reports, "In", "Out" and budgets read `installment`; balances read `posting`. Each concern has one source.
- Every income and expense must create at least one installment; the API enforces it and tests cover it.
- Statements, previous balances and differences with the bank are derived, so correcting a closing date only reassigns installments.
