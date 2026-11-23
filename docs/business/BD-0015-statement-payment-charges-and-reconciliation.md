# BD-0015. Statement payment, charges and reconciliation

- Status: Accepted
- Date: 2026-11-23
- Amends: the default categories in [BD-0009](BD-0009-movement-types-and-categories.md), adding the Financial charges group

## Context
Card statements are built by the app (see [BD-0014](BD-0014-credit-card-statements-and-installments.md)). Users need a direct way to pay them, and real statements include charges beyond purchases: interest, taxes and fees. A balance left unpaid carries over to the next statement.

## Decision

### Pay statement
- Every credit card has a **Pay statement** action. It opens a transfer prefilled with the statement amount, in pesos and dollars separately.
- The user picks the source account and pays the **total, the minimum, or another amount**.
- The dollar part can be paid with dollars or with pesos as an exchange (see [BD-0013](BD-0013-currencies-and-exchange.md)).

### Previous balance
- The unpaid balance of a statement is **not** recorded by the user and is **not** an expense. The app calculates it and shows it as "Previous balance" at the start of the next statement.
- Statement total = previous balance + installments of the period + charges − payments.

### Statement charges
- Charges are recorded inside a specific statement and count as expenses in that statement's month.
- New default expense group **Financial charges**, with these categories:

| Category | Includes |
| --- | --- |
| Interest | Financing on partial payments, late payment interest |
| Taxes | Stamp tax, VAT on interest and fees, gross income tax (IIBB), withholdings on dollar purchases |
| Fees | Annual or maintenance fees, over-limit fees |
| Card insurance | Life insurance on the balance |

- These categories are editable like any other.

### Reconciliation
- When the bank's statement arrives, the user enters its **total** and the app shows the difference with its own calculation.
- The difference helps find missing charges or unrecorded purchases. The user can record it as a single **Adjustment** charge instead of detailing it.

## Why
- Recording the previous balance as an expense would count the same money twice; calculating it keeps totals correct.
- Charges are real costs of using the card, so they belong in expenses and in summaries.
- Reconciling against the bank total keeps the app trustworthy without forcing users to copy every line of the statement.

## Consequences
- Each statement keeps its own state: amounts per currency, previous balance, charges, payments, the bank total when entered, and the difference.
- Paying less than the total leaves debt on the card, which carries over automatically.
- The Adjustment charge uses its own category, Adjustment, inside Financial charges.
- Default icons, following [ADR 0012](../adr/0012-category-icons-with-lucide.md): Interest `percent`, Taxes `receipt`, Fees `badge-dollar-sign`, Card insurance `shield-check`, Adjustment `scale`.
