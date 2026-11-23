# BD-0011. Accounts and transfers

- Status: Accepted
- Date: 2026-11-23
- Amends: the movement types in [BD-0009](BD-0009-movement-types-and-categories.md)

## Context
Users pay and get paid through cash, banks and virtual wallets, and use credit cards. They think in terms of where the money is ("I paid with Mercado Pago"), not in terms of payment types. Credit card statements must be recordable without counting purchases twice (see [BD-0009](BD-0009-movement-types-and-categories.md)).

## Decision

### Accounts
Every movement comes from or goes to an **account**. An account has a type:

| Type | Examples |
| --- | --- |
| Cash | Physical wallet |
| Bank | Galicia, Macro, Nación |
| Virtual wallet | Mercado Pago, Ualá, Naranja X |
| Credit card | Visa Galicia, American Express |

- An expense is paid **from** an account. An income goes **into** an account.
- A purchase with a credit card is an expense from the card account. It counts as an expense once, when the purchase happens.

### Transfers
There are three movement types: **income**, **expense** and **transfer**.
- A transfer moves money between two accounts of the same user: paying a card statement (bank to card), withdrawing cash (bank to cash), or topping up a wallet (bank to wallet).
- A transfer has no category and is **not** counted as income or expense in any total or report.

### Default accounts and catalog
- Every new user starts with a single account: **Cash**.
- When adding an account, the user picks an institution from a catalog or types a custom name.
- Initial catalog of banks: Banco Nación, Banco Provincia, Galicia, Santander, BBVA, Macro, Banco Ciudad, Credicoop, ICBC, Patagonia, Supervielle, Brubank.
- Initial catalog of virtual wallets: Mercado Pago, Ualá, Naranja X, Cuenta DNI, Personal Pay, Prex, Lemon.
- The catalog is a starting list, not a verified market ranking, and can grow over time.

### Managing accounts
- Accounts belong to each user (see [BD-0002](BD-0002-each-user-owns-their-data.md)).
- Users can create, edit and delete accounts freely.
- **An account that has movements cannot be deleted; it can only be deactivated**, the same rule as categories.

## Why
- Accounts match how users think about their money and make each movement easy to identify.
- Modeling credit cards as accounts and statement payments as transfers avoids double counting, and shows how much is owed on each card.
- Starting with only Cash keeps the account picker short; a full list of banks and wallets would bury the two or three each user actually uses.

## Consequences
- Each account can show its own balance; a credit card balance shows what is owed.
- An account needs a starting balance when it is created, so its balance is correct from day one.
- The month balance on the home screen is income minus expenses; transfers do not change it.
