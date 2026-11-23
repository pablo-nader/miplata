# BD-0026. Movement recording rules

- Status: Accepted
- Date: 2026-11-23
- Refines: [BD-0013](BD-0013-currencies-and-exchange.md), [BD-0014](BD-0014-credit-card-statements-and-installments.md), [BD-0017](BD-0017-loans-and-purchases-for-others.md), [BD-0020](BD-0020-search-and-filters.md)

## Context
Recording movements raises small questions the earlier decisions leave open. The app needs one answer for each so every screen agrees.

## Decision
- **Installments only on card expenses.** A card purchase can be split into 2 to 60 installments. Any other movement has exactly one. A refund recorded as income on a card counts in the month it happened.
- **Purchases for others only on expenses.** An income cannot belong to another person. The user's own share of a shared purchase must be smaller than the total; a purchase with no share for the user is a purchase entirely for the other person.
- **Who can pay.** Expenses and income use cash, bank, wallet or card accounts, never a person. Loans and repayments are transfers, so a person can be either side of a transfer.
- **Transfers.** A transfer in one currency moves the same amount from one account to another and cannot have the same account on both sides. A transfer with two currencies is an exchange: both amounts are entered and the account may be the same on both sides.
- **Currencies.** A movement can only use a currency the account holds, and the person of a shared purchase must hold it too.
- **Corrections.** Editing a movement replaces it entirely: its balances, installments and statement assignment are recalculated from the new data. Deleting it removes them. Neither can be undone.
- **Inactive items.** A new movement cannot use a deactivated account, person or category. Editing an old movement may keep the ones it already used.
- **Month totals.** "In" and "Out" for a month add the user's own amount of every installment that counts in that month, per currency, and leave out transfers, loans and the part other people owe.
- **Search.** Text search finds the typed text anywhere in the description, ignoring case. The amount filter looks at the amount the user paid or received, not at the part a person owes.

## Why
- Limiting installments and shares to the cases where they make sense avoids records that cannot be read later in statements and reports.
- Replacing a movement on edit guarantees the balances and installments always agree with what the user sees.

## Consequences
- Changing any rule is a new decision that supersedes this one.
