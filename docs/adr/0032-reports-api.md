# 0032. Reports API

- Status: Accepted
- Date: 2026-11-23
- Related: [0005](0005-per-user-data-isolation.md), [0016](0016-data-model.md), [0031](0031-movements-api.md), [BD-0014](../business/BD-0014-credit-card-statements-and-installments.md), [BD-0018](../business/BD-0018-initial-reports.md), [BD-0022](../business/BD-0022-calculation-conventions.md)

## Context
BD-0018 defines four reports. They read installments by `period_month` with the user's own amount ([0031](0031-movements-api.md)), never postings, so card installments, shared purchases, transfers and loans follow the existing rules without special cases.

## Decision
- **Module.** `apps/api/src/reports/` with the hexagonal layers. The repository exposes one aggregate read, `totals(userId, filter)`, that returns `sum(own_amount_minor)` grouped by month, movement type, category and category group for one currency, and one detail read, `spendingMovements`. The domain turns those rows into each report and reuses `percentChangeVsPreviousThree` and `monthlyInOut`.
- **Endpoints** (all behind `authMiddleware`; the user id comes only from the session): `GET /api/reports/spending`, `/spending/movements`, `/monthly`, `/changes`, `/committed`. Every query takes `currency` (default `ARS`) and optional `accountId` and `categoryId`; invalid queries answer `400`.
- **Counting.** Only movements of type `income` or `expense` have rows, and only their installments count, in the month of `period_month`. The account filter matches movements with a posting on that money account, so a foreign or person account matches nothing.
- **Spending.** Expenses of one month grouped by category group, largest first, with a share of the total; each group lists its categories largest first with a share of the group. Percentages round to one decimal, halves away from zero ([BD-0022](../business/BD-0022-calculation-conventions.md)). The drill-down to movements returns one row per movement with the sum of its installments in that month and, for a purchase in installments, the installment number and count.
- **Monthly.** Twelve months ending at `to`, each with In, Out and result.
- **Changes.** Each category's amount in the month and the integer average of the previous three months; a month without spending counts as zero; no percentage when the three are zero.
- **Committed.** The client sends the first month (`from`, normally the next month) and a count up to 12, because the server does not read the clock. Each month adds installments and, through an optional `RecurringCommitments` port, pending recurring occurrences. Until the recurring module is wired the port is absent and `recurringMinor` is `0`.
- **Names.** Responses carry ids only; names, colors and icons come from the categories endpoint, so translations stay in one place.
- **Tests.** Domain and route unit tests, and integration tests against Postgres for every endpoint with a data-isolation case, installments in statement months, shared shares, transfer exclusion and the three-month average with missing months.

## Alternatives considered
- **Reading postings:** wrong for installments and purchases for others.
- **Server-side clock for "coming months":** hides a dependency that makes tests time sensitive; the client already knows the current month.

## Consequences
- Report 4 shows installments only until the recurring module supplies the port.
- Every report is one indexed range scan on `installment(user_id, period_month)` plus joins, enough for one person's data.
