# BD-0016. Recurring movements

- Status: Accepted
- Date: 2026-11-23

## Context
Many movements repeat: rent, utilities, insurance, salary. Entering them by hand every month is slow and easy to forget, but their real amount or payment can change from month to month.

## Decision

### Definition
A recurring movement is a template the user defines once, with:
- Type: expense or income.
- Frequency: monthly, every two months, or yearly, on a given day.
- Amount: **fixed**, or **variable**. For a variable amount, the app suggests the last confirmed amount.
- Account, currency, category and description.

### Pending until confirmed
- Recurring movements are **never recorded automatically**.
- On their date they appear in a **"To pay"** list (or "To collect" for income).
- The user confirms each one with a single tap, adjusting the amount, account or date if needed. Only then is the movement recorded.
- An item that is not confirmed stays pending and is marked overdue after its date.
- The user can **skip** an occurrence without recording anything, for example when a bill did not arrive.

### Managing recurring movements
- Users can create, edit, pause and end recurring movements.
- Changes apply only to future occurrences; movements already recorded do not change.
- A recurring expense paid with a credit card becomes a card purchase when confirmed and follows the statement rules (see [BD-0014](BD-0014-credit-card-statements-and-installments.md)).

## Why
- Confirming keeps every recorded movement true: nothing is counted that did not happen or happened with a different amount.
- The "To pay" list doubles as a reminder of upcoming due dates.

## Alternatives considered
- Recording recurring movements automatically on their date: no effort, but records stay wrong when a payment is skipped or the amount changes, until the user notices and fixes them.

## Consequences
- The home screen needs a visible entry point to the "To pay" list when items are pending.
- Pending occurrences are not counted in balances or totals until confirmed.
