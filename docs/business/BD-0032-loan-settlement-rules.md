# BD-0032. Loan settlement rules

- Status: Accepted
- Date: 2026-11-23
- Completes: [BD-0017](BD-0017-loans-and-purchases-for-others.md)

## Context
[BD-0017](BD-0017-loans-and-purchases-for-others.md) says that a repayment above the debt becomes income and that a forgiven debt becomes an expense, but not how each case is recorded or what the Loans view shows.

## Decision
- **Loans view**: groups people into "they owe you" and "you owe", with the amount per currency and a total per currency for each group. A person whose balance is zero in every currency is not listed. A person can appear in both groups when they owe in one currency and are owed in another.
- **Purchases for others**: for each person the view shows what falls on the current month's statement and what is still pending in total, counting only the person's part of each installment (full amount minus the user's own share). Both figures are informational: the person's balance already includes the whole purchase from the day it was recorded.
- **Repayment above the debt**: when a person who owes the user in a currency repays more than the balance into one of the user's accounts, the transfer settles exactly the balance and the excess is recorded as income in the same account. The income uses the user's active "Other" income category, or the first active income category when that one does not exist. A transfer from a person who owes nothing, or whom the user owes, is a loan received, not income. Repayments in a different currency are not split.
- **Forgiving a debt**: the user picks a category and the whole remaining balance in that currency is settled in one step. If the person owed the user, it is recorded as an expense; if the user owed the person, it is recorded as income, in the chosen category, dated today unless a date is given. No account of the user's changes.

## Why
- Splitting the repayment keeps the person's balance honest (never negative because of a generous payment) while the excess is real money the user did not expect, so it belongs in income.
- Forgiving needs a category so the loss or gain shows up in reports like any other movement.
- Showing the pending installments without changing balances avoids counting the same debt twice.

## Consequences
- A repayment above the debt creates two movements: the transfer for the balance and an income for the excess.
- A forgiveness movement has no account of the user, only the person.

## Limits
- Installments of past statements are already due and appear only in the person's balance, not in the "current statement" or "pending" figures.
- If the user has no active income category, a repayment above the debt is recorded as a plain transfer and the balance goes negative.
