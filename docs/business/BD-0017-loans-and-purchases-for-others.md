# BD-0017. Loans and purchases for others

- Status: Accepted
- Date: 2026-11-23

## Context
Users lend money to people they know and borrow from them, in pesos or dollars. They also pay for other people's purchases with their own credit card and get the money back as installments come due. None of this is the user's own income or expense.

## Decision

### People as accounts
- A user keeps a list of **people** (for example, Juan or a sister). Each person works like an account with a balance **per currency** (see [BD-0011](BD-0011-accounts-and-transfers.md) and [BD-0013](BD-0013-currencies-and-exchange.md)).
- A positive balance means the person owes the user; a negative balance means the user owes the person.

### Loans
- Lending is a **transfer** from one of the user's accounts to the person. Being repaid is a transfer from the person to an account.
- Borrowing is a transfer from the person to one of the user's accounts. Repaying is a transfer back to the person.
- Loans are **not** income or expense: they do not change "In" or "Out", but they do change the total balance, since money owed to the user adds and money the user owes subtracts.
- A repayment in another currency is an exchange transfer with a rate.
- A **Loans** view lists who owes the user, whom the user owes, and how much, per currency.

### Purchases for others
- When recording a card purchase, the user can mark it as **belonging to another person**. The card owes the full purchase and its installments follow the statement rules (see [BD-0014](BD-0014-credit-card-statements-and-installments.md)), but it is **not** the user's expense.
- The person owes each installment as it falls into a statement, and the app shows how much is due on the current statement and how much is pending in total.
- A purchase can also be **shared**: the user's part is an expense in its category, and the rest is owed by the other person.
- The same applies to purchases paid from any account, not only cards.

### Edge cases
- If a person repays more than they owe, the difference is recorded as income.
- If the user forgives a debt, the remaining amount becomes an expense.

### Scope
- People are names inside each user's data only. They are **not linked** to other miPlata users: what a user records about someone is never visible to that person (see [BD-0002](BD-0002-each-user-owns-their-data.md)).
- Linking people to other users may be considered in the future and would need its own decision.

## Why
- Treating people as accounts reuses transfers, currencies and balances, so loans need no special accounting.
- Separating purchases for others keeps the user's spending and categories true while still tracking what they are owed.

## Consequences
- People can be created, edited and deactivated. A person with movements cannot be deleted, only deactivated, like accounts and categories.
- Installments owed by another person must be tracked per statement.
