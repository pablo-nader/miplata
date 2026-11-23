# BD-0022. Calculation conventions

- Status: Accepted
- Date: 2026-11-23
- Refines: [BD-0013](BD-0013-currencies-and-exchange.md), [BD-0014](BD-0014-credit-card-statements-and-installments.md), [BD-0016](BD-0016-recurring-movements.md), [BD-0017](BD-0017-loans-and-purchases-for-others.md), [BD-0018](BD-0018-initial-reports.md), [BD-0021](BD-0021-budgets.md)

## Context
The earlier decisions leave small details open. The business rules need one answer for each, so every screen and report agrees.

## Decision

### Amounts typed by the user
- A comma is the decimal separator. A single dot followed by exactly three digits is a thousands separator (`1.234` is one thousand two hundred thirty-four pesos), otherwise a dot is a decimal separator. When both appear, the last one is the decimal separator. A separator repeated with groups of three digits is a thousands separator (`1.234.567` and `1,234,567`).
- Amounts have at most two decimals. Exchange rates have at most four decimals, and a rate such as `1.230` is rejected as ambiguous: the user writes `1230` or `1230,0`.

### Installments and shared purchases
- A purchase needs at least one minor unit per installment.
- The user's share of a shared purchase is spread over installments in proportion to each installment, giving leftover cents to the largest remainders, earliest installment first. An installment never owes more than its amount.

### Statements
- A statement belongs to the month of its closing date. A corrected closing date must stay inside that month, and the due date must fall after the closing date.
- A closing or due day that does not exist in a month moves to the last day of that month.
- The due date is in the closing month when the due day is later than the closing day in that month, otherwise in the next month.

### Recurring movements
- Every two months counts from the month of the start date. A start date after the day of the month skips the start month.
- A day that does not exist in a month moves to the last day of that month, including 29 February in non leap years.
- A paused recurring movement produces no due dates in any window. Occurrences that already exist stay as they are; the caller handles them.

### Budgets
- A refund that makes spending negative counts as zero spent.
- Remaining never goes below zero; the excess is reported as overspent.

### Reports
- The change against the previous three months divides their sum by three, so a month without spending counts as zero.
- When the previous three months are all zero there is no baseline and no percentage is shown.
- Reports reject negative category totals; only budgets clamp them.
- Percentages round to one decimal, halves away from zero.
- "In" and "Out" use the user's own amount of each installment, so what other people owe never counts.

## Why
These choices keep results predictable, never lose cents, and match how people in Argentina write amounts and read statements.

## Consequences
- Changing any convention is a new decision that supersedes this one.
