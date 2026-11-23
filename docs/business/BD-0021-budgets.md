# BD-0021. Budgets

- Status: Accepted
- Date: 2026-11-23

## Context
Users want to set spending limits and see how close they are to them during the month.

## Decision
- A budget is a **monthly limit** for an expense **category or group**, in one currency.
- Each budget shows a progress bar with the amount spent and the amount left for the current month.
- When spending reaches **80%** of the limit, the app shows a calm notice; at **100%** it shows that the limit was reached. Neither uses alarm red (see the calm principle in [PRODUCT.md](../../PRODUCT.md)).
- Spending counted against a budget follows the existing rules: installments count in their statement month, only the user's share of shared purchases counts, and transfers, exchanges and loans never count.
- Budgets do not roll over: each month starts from zero.
- Users can create, edit and delete budgets freely.

## Why
A monthly limit with a progress bar is the simplest way to help users control spending without turning the app into an alarm.

## Alternatives considered
- Rolling unspent budget into the next month: useful for some, but harder to understand; can be added later.
- Budgets per account: less useful, since spending decisions are made by category, not by account.

## Consequences
- The home screen or a dedicated view shows budgets close to their limit.
- A category inside a budgeted group counts toward the group's budget; a category can also have its own budget.
