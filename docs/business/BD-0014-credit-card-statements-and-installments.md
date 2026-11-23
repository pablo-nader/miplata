# BD-0014. Credit card statements and installments

- Status: Accepted
- Date: 2026-11-23

## Context
Credit cards are accounts (see [BD-0011](BD-0011-accounts-and-transfers.md)). In Argentina, card purchases are often paid in installments (cuotas), and whether a purchase lands in the current or the next statement depends on the card's closing date, which banks move from month to month.

## Decision

### Statements
- Every credit card has a usual **closing day** and **due day**.
- The app builds the card's **statements** from those dates. Each statement has a closing date and a due date.
- The user can **correct the dates of a single statement** when the bank moves them. Purchases of that period are then reassigned to the right statement.

### Assigning purchases
- A purchase made **on or before** a statement's closing date belongs to that statement; a purchase made **after** it belongs to the next one.
- A purchase is recorded **once**, with its total amount and number of installments. The app generates the installments.
- Installment 1 belongs to the statement the purchase date falls into; each following installment belongs to the next statement.
- The installment amount is the total divided by the number of installments; any rounding difference goes to the first installment.
- A purchase in a single payment is a purchase with one installment.
- Every installment keeps the purchase's category and description.

### When a card expense counts
- Card expenses count **installment by installment**, in the month of the statement each installment belongs to. The statement month is the month of its closing date.
- Example: a $ 900.000 purchase in 3 installments shows $ 300.000 in "Out" for each of the three statement months.

### What the card shows
- **Amount due on the current statement**, with its due date.
- **Total debt**, including future installments.

### Paying a statement
Paying a statement is a transfer from an account to the card (see [BD-0011](BD-0011-accounts-and-transfers.md)). The dollar part can be paid in dollars or as an exchange from pesos (see [BD-0013](BD-0013-currencies-and-exchange.md)).

## Why
- Counting installments month by month matches what users actually pay each month, which is how installments are thought about in Argentina.
- Recording the purchase once and generating installments keeps recording fast.
- Editable statement dates follow the real bank calendar without forcing users to enter dates every month.

## Alternatives considered
- Counting the full purchase in the month it happened: reflects consumption, but makes that month look far more expensive and the following months cheaper than they are.

## Consequences
- Monthly "Out" totals for card expenses follow statement months, not purchase dates. A purchase made after the closing date counts in the following month.
- Editing or deleting a purchase regenerates or removes all its installments.
- When the purchase includes financing interest, the user records the total financed amount.
