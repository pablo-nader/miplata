# BD-0027. Statement rules

- Status: Accepted
- Date: 2026-11-23
- Refines: [BD-0013](BD-0013-currencies-and-exchange.md), [BD-0014](BD-0014-credit-card-statements-and-installments.md), [BD-0015](BD-0015-statement-payment-charges-and-reconciliation.md), [BD-0017](BD-0017-loans-and-purchases-for-others.md)

## Context
Building statements end to end leaves small questions open in the earlier decisions. Each needs one answer so every screen and report agrees.

## Decision
- **Previous balance.** It is everything the card owed before the statement: the card's opening debt plus, for every earlier statement, its installments (the user's and other people's), its charges, minus its payments, per currency. A month without a statement still carries the balance forward.
- **Statement total.** Previous balance + the user's purchases and installments + other people's installments + charges − payments, per currency. Pesos and dollars are never added together.
- **Paying.** A payment is a transfer linked to the statement it pays. The user may pay any amount, including more than the total. The dollar part is paid in dollars or in pesos; the user enters the pesos spent, so the rate is whatever the bank applied. Paying from a person or from another card is not allowed.
- **Minimum and bank total.** The app cannot know the bank's minimum payment, so the user enters it together with the bank's total, per currency, and can clear both.
- **Difference with the bank.** Bank total minus the app's total. A positive difference means the bank charged more than the app knows.
- **Adjustment.** Only a positive difference can be recorded, as one Adjustment charge per currency. Recording it again after the bank total changes updates that same charge instead of adding another. A bank total below the app's total is not adjusted: something recorded twice or a payment that is missing explains it better than a negative charge. If an Adjustment charge exists and the bank total no longer needs it, asking again removes it. Two requests at once still leave a single charge.
- **Charges.** A charge belongs to one statement and stays in it when the statement dates change. Its date defaults to the closing date. Only categories of the Financial charges group can be used. A charge or a payment is edited from its statement, never from the movements screen; it can still be deleted from there.
- **Deactivated cards.** A deactivated card keeps its statements: it can still receive charges and payments, so a closed card's debt can be paid and reconciled. The source account of a payment must be active.
- **Transfers outside Pay statement.** A transfer to the card that is not made with Pay statement, and an income recorded on the card, lower the card balance but belong to no statement, so no statement total includes them.
- **Correcting dates.** When the user moves a closing date, the purchases made that month are assigned again with the new date, together with all their installments. Purchases of other months and charges do not move.
- **Opening the current statement.** Opening a card's statements creates the one the card is in today if it does not exist yet, so charges and payments can be recorded before any purchase.

## Why
- A running balance that never depends on a statement existing for every month matches how debt behaves.
- Letting the user type the minimum avoids guessing a rule that differs per bank.
- Refusing negative adjustments keeps "Adjustment" a cost, like the other charges.

## Consequences
- Charges and payments cannot be edited as movements; the movements screen must send the user to the statement.
- Changing a closing date can change the month an installment counts in, and therefore "Out" for both months.
