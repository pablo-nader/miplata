# 0031. Movements API

- Status: Accepted
- Date: 2026-11-23
- Related: [0005](0005-per-user-data-isolation.md), [0016](0016-data-model.md), [0017](0017-project-structure.md), [0030](0030-accounts-and-people-api.md), [BD-0026](../business/BD-0026-movement-recording-rules.md)

## Context
Movements are the feature that makes the app usable (BD-0005, BD-0009, BD-0011, BD-0013, BD-0014, BD-0017, BD-0020). Every income and expense writes postings and at least one installment ([0016](0016-data-model.md)); transfers write postings only.

## Decision
- **Module.** `apps/api/src/movements/` with the hexagonal layers. The domain builds a `MovementPlan` (postings, installments, statements to ensure) from a validated request and already resolved accounts and category. It reuses `splitPurchase` and `assignInstallmentStatements`. The application layer loads the references through the account and category repositories, asks the movement repository for existing statement dates and stores the plan. Infrastructure writes everything in one transaction.
- **Endpoints.** `GET|POST /api/movements`, `GET|PUT|DELETE /api/movements/:id`, `GET /api/movements/summary?month=YYYY-MM`. All mount `authMiddleware`; the user id comes only from the session. Unknown, malformed or foreign ids answer `404`; a request that names an account, category or person of another user answers `400` with reason `account_not_found`, `category_not_found` or `person_not_found`, so nothing leaks. A movement referenced by a confirmed recurring occurrence answers `409 movement_in_use` on delete.
- **Request shape.** A discriminated union on `type`: entries (`income`, `expense`) carry one account, currency, total amount, `installments` and an optional `person { personId, ownAmountMinor }`; transfers carry `from` and `to` legs with their own currency and amount, which expresses an exchange. Amounts are positive minor units as safe integers ([0023](0023-money-as-safe-integers-in-the-domain.md)). Schemas live in `@miplata/shared`.
- **Edit is a full replacement.** `PUT` takes the same body as `POST`. In one transaction it updates the movement row, deletes its postings and installments and writes the new ones, so the type, accounts and installment count can all change and no partial state is ever visible. Statements created by earlier plans stay; they are shared with other purchases and belong to the next stage.
- **Statements.** For card expenses the repository reads the statement rows of the card in the affected window and passes them as overrides, so a corrected closing date is honoured. Missing statements are created from the card days with `insert ... on conflict do nothing` on `(account_id, period_month)`, then read back to link each installment.
- **Stored statements are the schedule.** A statement row, whether created from the card days or corrected by the user, is read back on later purchases, so changing a card's closing or due day affects only months with no statement row yet. A stored row whose closing date is outside its month or whose due date is not after the closing date is ignored and the card days apply, so one bad row never blocks recording.
- **Limits.** An amount is at most 1.000.000.000.000 minor units (ten billion), so sums of balances and totals stay inside the safe integer range ([0023](0023-money-as-safe-integers-in-the-domain.md)). A list query whose period or amount range is inverted answers `400`.
- **Deleting.** Postings and installments cascade from the movement row.
- **Inactive references.** An inactive account, person or category is refused for a new movement, but an edit may keep references the movement already used, so a description can still be corrected after an account is deactivated.
- **Reading.** A movement is returned as one record: `account` (entries) or `from` and `to` (transfers), `person`, and its `installments`. The list is ordered by date, then creation, newest first, and paginated with `limit` (default 50, at most 100) and `offset`, returning `hasMore`.
- **Filters** (BD-0020). Text search is a case-insensitive substring match on the description with `%` and `_` escaped, backed by the trigram index. Period, type and category filter the movement; account and person filter by "has a posting on that account"; currency by "has a posting in that currency"; group through the category; the amount range applies to the main amount (the paying account for entries, the outgoing leg for transfers). Every subquery repeats the `user_id` filter.
- **Month summary.** "In" and "Out" per currency are the sum of `own_amount_minor` of installments whose `period_month` is the month, joined to the movement type. Transfers and loans have no installments, so they never count. Both currencies are always returned.
- **Tests.** Domain and use-case unit tests, route tests with in-memory repositories, and integration tests against Postgres for every endpoint with a data-isolation case each.

## Alternatives considered
- **Patching individual fields on edit:** smaller payloads, but every change to amount, account or installments needs the postings and installments regenerated anyway.
- **Cursor pagination:** stable under concurrent inserts, but the list is for one person and offset keeps the client simple.
- **Computing the summary from postings:** wrong for installments and for purchases for others ([0016](0016-data-model.md)).

## Consequences
- The balance of an account changes as soon as a movement is written; there is no stored balance to keep in sync.
- Statement rows are never deleted by this stage. An account that only ever had statements cannot be deleted, only deactivated, which matches [0030](0030-accounts-and-people-api.md).
- Amount filtering is by main amount only; a filter on the person's part is not offered.
