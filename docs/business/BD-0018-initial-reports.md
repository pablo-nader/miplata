# BD-0018. Initial reports

- Status: Accepted
- Date: 2026-11-23

## Context
Recording movements is only useful if users can understand them. Reports must answer concrete questions quickly on a phone.

## Decision
The first version ships four reports.

1. **Where does my money go?** Expenses of the selected month by group, largest first, as horizontal bars with the share of each. Tapping a group shows its categories; tapping a category shows its movements.
2. **How am I doing month by month?** "In" versus "Out" for the last 12 months, with each month's result, positive or negative.
3. **What changed this month?** Each category's amount compared with its average over the previous three months, as a percentage difference.
4. **What is already committed?** Installments and recurring movements expected in each of the coming months.

All reports:
- Keep pesos and dollars separate, with a currency selector.
- Filter by period, account and category.
- Follow the existing rules: installments count in their statement month ([BD-0014](BD-0014-credit-card-statements-and-installments.md)); transfers, exchanges and loans are not income or expense ([BD-0011](BD-0011-accounts-and-transfers.md), [BD-0017](BD-0017-loans-and-purchases-for-others.md)); pending recurring movements count only in the committed report ([BD-0016](BD-0016-recurring-movements.md)).

## Why
Each report answers one question users actually ask: what they spend on, whether they spend more than they earn, what is unusual, and how much of their future income is already spent.

## Alternatives considered
- **Inflation-adjusted comparisons** using INDEC's consumer price index: nominal comparisons are misleading with high inflation, but adjusting requires external data. Deferred to a later stage by the owner.

## Consequences
- Comparisons in report 3 are nominal; the screen should not present a nominal increase as a real one.
- Report 4 depends on statements and recurring movements being up to date.
