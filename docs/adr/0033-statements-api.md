# 0033. Statements API

- Status: Accepted
- Date: 2026-11-23
- Related: [0005](0005-per-user-data-isolation.md), [0016](0016-data-model.md), [0017](0017-project-structure.md), [0031](0031-movements-api.md), [BD-0027](../business/BD-0027-statement-rules.md)

## Context
Cards need statements that show what is owed, accept charges and payments, follow the bank's dates and reconcile with the bank ([BD-0014](../business/BD-0014-credit-card-statements-and-installments.md), [BD-0015](../business/BD-0015-statement-payment-charges-and-reconciliation.md)).

## Decision
- **Module.** `apps/api/src/statements/` with the hexagonal layers. The domain computes summaries from aggregated amount lines (`summarizeStatements`), validates dates, and plans charges and payments by reusing `planTransfer` and the movement plan. The application layer loads the card, statement, categories and accounts and writes through the movements repository. The Drizzle repository holds the aggregates and the reassignment of installments. The statement row helpers (`ensureStatements`, `readStatementOverrides`) moved to `statements/infrastructure/statement-rows.ts` and the movements repository uses them.
- **Endpoints.** All mount `authMiddleware`; the user id comes only from the session. `GET /api/statements?accountId=` lists a card's statements with totals and opens the current one; `GET /api/statements/:id` returns the detail (purchases, other people's installments, charges, payments, totals); `PATCH /:id` corrects the dates; `PUT /:id/bank-figures` stores bank total and minimum per currency; `POST /:id/charges`, `PUT|DELETE /:id/charges/:movementId`; `POST /:id/payments`; `POST /:id/adjustment`. Every mutation answers with the full statement detail so the client replaces its state in one step. Foreign, unknown or malformed ids answer `404`; a request that names an account or category of another user answers `400` with reason `account_not_found` or `category_not_found`.
- **How amounts are stored.** A charge is an expense movement on the card whose `movement.statement_id` is set, with one installment in that statement. A payment is a transfer whose `movement.statement_id` is set. A purchase has no `movement.statement_id` and reaches a statement through its installments. This tells the three apart without a new column. Totals come from sums grouped by statement and currency.
- **Previous balance.** Computed in memory, oldest statement first, from the opening debt of the card and the totals of earlier statements.
- **Reassigning.** Correcting a closing date runs in one transaction: it updates the row, finds the card purchases of that month, recalculates their statements with `assignInstallmentStatements` using the stored statements as overrides, creates the missing statements and updates every installment.
- **Financial charges.** The group is recognised by its translation key `defaults.group.financialCharges` and the adjustment category by `defaults.category.adjustment`. A user who renames the default group or category loses the match; a later decision can add an explicit marker.
- **Movements.** `MovementPlan` gains an optional `statementId`. `MovementRepository` gains `createAll`, which writes several plans in one transaction (a payment in pesos and dollars), and `isStatementBound`, so `PUT /api/movements/:id` answers `409 statement_movement` for charges and payments.
- **Clock.** The current statement is opened with the Argentine calendar day, injected as `today` so tests are deterministic.
- **Tests.** Domain and route tests with in-memory fakes, and integration tests against Postgres for every endpoint with a data-isolation case each.

## Alternatives considered
- **A `kind` column on `movement`:** clearer, but needs a migration; the existing `statement_id` and the type are enough.
- **Storing the previous balance:** cheaper to read, but wrong as soon as an older movement is edited.

## Consequences
- Reading a card's statements computes totals over all its statements; it is cheap for personal use and avoids stale numbers.
- The web must offer deleting a charge or payment from the movements screen only through the generic delete.
