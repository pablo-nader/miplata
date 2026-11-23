# BD-0025. Account balances and opening amounts

- Status: Accepted
- Date: 2026-11-23
- Related: [BD-0011](BD-0011-accounts-and-transfers.md), [BD-0013](BD-0013-currencies-and-exchange.md), [BD-0017](BD-0017-loans-and-purchases-for-others.md)

## Context
BD-0011 says an account needs a starting balance and BD-0013 and BD-0017 say how card debt and people count in the total. Building the accounts screens needs a few concrete rules about how those amounts are entered and shown.

## Decision
- **Opening balance.** Every currency of an account has an opening balance, zero when left empty. It can be changed later; the balance then updates, because balances are calculated from the opening balance and the movements.
- **Credit cards.** The user enters the **current debt** as a positive number; the app stores it as a negative balance. The card balance is shown as a negative amount with the note "total debt".
- **People.** The opening balance is signed: positive means the person owes the user, negative means the user owes the person. A person can owe in one currency and be owed in the other.
- **Inactive accounts** do not count in the total balance and do not appear in the balance detail. They stay in Accounts, in an "Inactive" section, from where they can be reactivated.
- **Default Cash** can be renamed like any other account and cannot be deleted once it has movements.
- **Deleting** an account is offered only when it has no movements, with a confirmation that says it cannot be undone. When it has movements the screen explains that it can only be deactivated, and deactivating asks for a confirmation that says the movements are kept.
- **Card subtitle** shows the closing and due days the user entered until statements exist (BD-0014); then it will show the next due date and amount.

## Why
- Entering a debt as a positive number matches how people think about it ("I owe 1,000"), while storing it negative lets every total be a plain sum.
- Keeping inactive accounts out of the total means deactivating an account really removes it from view, which is why users deactivate.

## Consequences
- The movements stage must treat card purchases as negative postings on the card and card payments as positive ones.
