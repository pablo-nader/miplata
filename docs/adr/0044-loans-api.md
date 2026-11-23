# 0044. Loans API

- Status: Accepted
- Date: 2026-11-23
- Implements: [BD-0017](../business/BD-0017-loans-and-purchases-for-others.md) and [BD-0032](../business/BD-0032-loan-settlement-rules.md)

## Context
People are accounts of type `person` ([BD-0011](../business/BD-0011-accounts-and-transfers.md)), so balances already exist per currency. The app lacked an aggregated Loans view, a person detail, forgiveness and the overpayment rule.

## Decision
- New module `apps/api/src/loans` with three routes under `/api/loans`: `GET /` (aggregate), `GET /:personId` (balances plus the latest 100 movements of that person) and `POST /:personId/forgive` (`currency`, `categoryId`, optional `occurredOn`).
- The aggregate is computed from the user's person accounts; no new table. Pending installments come from `MovementRepository.pendingPersonShares`: installments from the current month onwards on movements that have a person posting, summing `amount − own_amount`, scoped by `user_id`.
- Forgiveness is a movement built by the application layer and written with `MovementRepository.create`, so it is one transaction: type expense or income by the sign of the balance, a single posting on the person that cancels the balance, and one installment whose own amount is the whole amount, so reports count it.
- Overpayment lives in `createMovement`: for a same-currency transfer from a person who owes the user into a money account, the plan is split into the settling transfer and an income, written with `createAll` in one transaction.
- Every query takes `userId` from the session; each endpoint has a data-isolation integration test.

## Alternatives considered
- A separate loans table: duplicates balances that postings already provide. Rejected.
- Asking for the income category in the repayment request: BD-0017 says the excess is recorded automatically. Rejected.

## Consequences
- Forgiveness locks the person and re-reads the balance inside its transaction, so a second request after the balance changed fails with `balance_changed`. Repayments are not locked: two simultaneous repayments by the same person can both read the same balance, and the risk is accepted. Editing or deleting a repayment that was split does not touch its companion income, because the two movements are independent.
