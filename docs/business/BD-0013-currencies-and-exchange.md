# BD-0013. Currencies and exchange

- Status: Accepted
- Date: 2026-11-23

## Context
In Argentina it is common to hold savings and pay some expenses in US dollars, and to buy and sell dollars. There is no single exchange rate (official, MEP, blue, card), so any conversion depends on which rate is chosen.

## Decision

### Currencies
- The app supports **Argentine pesos (ARS)** and **US dollars (USD)**.
- Every movement has an amount and a currency.
- An account holds **one or both currencies**, with a separate balance for each. For example, Cash with pesos and dollars, a bank with a peso and a dollar savings account, or a credit card whose statement has a peso and a dollar part.
- When recording a movement, only the currencies of the chosen account are offered.

### Currency exchange
- Buying or selling dollars is a **transfer with two amounts**: the amount that leaves in one currency and the amount that arrives in the other.
- The user enters both amounts, or one amount and the rate, and the app calculates the rest. The rate is stored as pesos per dollar.
- The exchange can happen inside one account (pesos to dollars in the same bank) or between accounts.
- Like every transfer, an exchange is **not** counted as income or expense (see [BD-0011](BD-0011-accounts-and-transfers.md)).
- The dollar part of a card statement can be paid with dollars, or with pesos as an exchange transfer.

### Totals
- Totals are **kept separate per currency**. The app never adds pesos and dollars together, so it needs no external exchange rate.
- The home screen shows the **total balance in pesos** as the main figure, and the **total in dollars** below it in small type, only when it is not zero.
- The total balance is the sum of all active account balances in that currency. Credit card balances count as debt and reduce it.
- Tapping the balance opens a **balance detail** screen that shows the balance of each account in each currency.

## Why
- Separate totals are always exact and do not change when an external rate moves.
- Recording both amounts of an exchange captures exactly what happened, including bank spreads and rounding.
- Most users think in pesos day to day, so pesos lead and dollars stay visible without competing.

## Alternatives considered
- A single total converted with an exchange rate: easier to read, but requires choosing a rate, fetching it from an external service, and shows a number that changes without any user action. It can be added later without changing the data model.

## Consequences
- Account balances and reports are calculated per currency.
- The home screen also shows the month's money in and money out per currency (see [DESIGN.md](../../DESIGN.md)).
