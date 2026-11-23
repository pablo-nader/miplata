# 0037. Budgets API and screen

- Status: Accepted
- Date: 2026-11-23
- Related: [0005](0005-per-user-data-isolation.md), [0016](0016-data-model.md), [0031](0031-movements-api.md), [BD-0021](../business/BD-0021-budgets.md), [BD-0022](../business/BD-0022-calculation-conventions.md)

## Context
Budgets (BD-0021) are a monthly limit for an expense category or group in one currency, with progress computed from the installments of the month. The domain already has `budgetProgress` and `budgetSpent`; the `budget` table already enforces exactly one target and a positive limit.

## Decision
- **Module.** `apps/api/src/budgets/` with the hexagonal layers. The use cases reuse the domain functions and the category repository; the Drizzle repository stores budgets and aggregates spending.
- **Endpoints.** `GET /api/budgets?month=YYYY-MM[&attention=true]`, `POST /api/budgets`, `PUT /api/budgets/:id`, `DELETE /api/budgets/:id`. All mount `authMiddleware`; the user id comes only from the session. Malformed or foreign ids answer `404`; a body naming a category or group of another user, an income category or no existing target answers `400` with reason `category_not_found` or `group_not_found`.
- **One budget per target and currency.** A second budget for the same category or group in the same currency answers `409 budget_exists`. The check runs in the same transaction as the write; no database index enforces it, so two truly concurrent requests of the same user could both pass. A single person using one app makes that acceptable.
- **Edit is a full replacement** with the same body as create, like movements ([0031](0031-movements-api.md)).
- **Spending.** The repository sums `own_amount_minor` of installments whose `period_month` is the month, joined to expense movements, grouped by currency and category. Transfers, exchanges and loans have no installments, so they never count; income is excluded by type. A group budget sums the expense categories currently in the group, and a category with its own budget also counts toward its group's budget.
- **Progress.** Each item returns the budget, the month, `spentMinor`, `remainingMinor`, `overspentMinor` and `state` (`below`, `warning` from 80%, `reached` from 100%), following BD-0022: negative spending counts as zero and remaining never goes below zero. There is no rollover because each request only reads the requested month.
- **Close to the limit.** `attention=true` returns only `warning` and `reached` budgets, reached first. The home screen uses it.
- **Screen.** A Presupuestos screen reachable from the menu lists budgets with the progress bar component and offers a create and edit form built only from existing components. The near-limit bar uses the approved orange; there is no alarm red.

## Alternatives considered
- **A unique index on target and currency:** stronger under concurrency, but it needs a migration that would conflict with the parallel stages; the application check is enough for one person per account.
- **Computing progress in the client from the movements list:** duplicates the rules and breaks with pagination.

## Consequences
- Deleting a category or group cascades its budgets through the existing foreign keys.
- Reports and the home screen read progress from the same endpoint, so every screen agrees.
