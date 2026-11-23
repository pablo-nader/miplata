# 0030. Accounts and people API

- Status: Accepted
- Date: 2026-11-23
- Related: [0005](0005-per-user-data-isolation.md), [0016](0016-data-model.md), [0017](0017-project-structure.md), [0027](0027-better-auth-integration.md)

## Context
The accounts feature (BD-0011, BD-0013, BD-0017) needs endpoints to manage cash, banks, wallets, credit cards and people, to read the institution catalog and to calculate balances. Balances are calculated, never stored ([0016](0016-data-model.md)), and every row belongs to one user ([0005](0005-per-user-data-isolation.md)).

## Decision
- **Two modules, one table.** `apps/api/src/accounts/` manages `cash`, `bank`, `wallet` and `credit_card`; `apps/api/src/people/` manages `person`. Both read and write the `account` table through the same Drizzle repository, created once per set of allowed types, so a person is never reachable through `/api/accounts` and an account never through `/api/people`. The use cases live once in `accounts/application`; `people/application` only fixes the type and removes institutions and card days.
- **Endpoints.** `GET|POST /api/accounts`, `GET|PATCH|DELETE /api/accounts/:id`, `POST /api/accounts/:id/deactivate` and `/reactivate`; the same shape under `/api/people`; `GET /api/institutions`; `GET /api/balance`. All mount `authMiddleware`. The user id comes only from the session, and every query filters by it. An id that does not exist, is malformed or belongs to another user answers `404`.
- **Responses.** An account carries its institution, card days, `isActive`, `canDelete` and, per currency, the opening balance and the calculated balance, all in minor units as safe integers ([0023](0023-money-as-safe-integers-in-the-domain.md)). Request and response schemas live in `@miplata/shared` and are used by the API and the web app.
- **Balance calculation.** The balance per account and currency is the opening balance plus the sum of its postings, calculated in SQL per request. The total per currency is the sum of the balances of **active** accounts, including cards (negative) and people (positive when they owe the user, negative when the user owes them), so debt and loans need no special case in the sum. `GET /api/balance` returns the totals and one line per active account and currency, ordered by type and name.
- **Delete versus deactivate.** An account can be deleted only when nothing references it: no posting, statement or recurring movement. Otherwise `DELETE` answers `409 account_in_use` and the client offers deactivation. The database foreign keys (`ON DELETE RESTRICT`) are the second line of defense: a violation is mapped to the same `409`.
- **Currencies.** `PATCH` replaces the set of currencies and their opening balances. Removing a currency that has postings or recurring movements answers `409 currency_in_use`.
- **Names.** The seeded Cash account keeps `name_key` and is shown translated. Renaming it stores `name` and clears `name_key`. An account created from the catalog stores the institution name in `name` unless the user types another.
- **Institutions.** The catalog is global and read-only, so it is the only endpoint without a `user_id` filter; it still requires a session. Institution logos are not served until the owner approves each source ([BD-0012](../business/BD-0012-institution-logos.md)); the web app shows the icon of the account type.
- **Validation.** Pure rules in the domain layer (`normalizeAccount`) decide which fields fit each type; Zod schemas validate shapes at the edge.
- **Tests.** Domain and use-case unit tests, route tests with an in-memory repository, and integration tests against the CI Postgres container that cover every endpoint, a data-isolation case per endpoint, the delete-versus-deactivate rule and the balance calculation.

## Alternatives considered
- **One module for all five types:** less code, but people have different rules (no institution, signed opening balance) and their own screens; two thin modules over one repository keep both clear.
- **Storing the balance on `account_currency`:** faster reads, but it can drift from the postings ([0016](0016-data-model.md)).
- **Soft-deleting instead of refusing to delete:** hides the account without freeing its name, and BD-0011 already says an account with movements can only be deactivated.

## Consequences
- The movements stage writes postings and gets balances, `canDelete` and the delete rule for free; it must keep every posting in one of the account's currencies, because the API refuses to drop a currency that has postings but does not check the reverse.
- Balances are recalculated on every request. At the expected size (thousands of postings per user) this is fast; a cache is a later decision if that changes.
