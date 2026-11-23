# 0040. Statement dates editing and statement-bound movements in the web

- Status: Accepted
- Date: 2026-11-23
- Completes: [BD-0014](../business/README.md), [BD-0015](../business/README.md) and [BD-0027](../business/BD-0027-statement-rules.md) on the web side

## Context
`PATCH /api/statements/:id` corrects a statement's closing and due dates, but no screen called it. Separately, the API refuses to edit a statement charge or payment through `PUT /api/movements/:id` (409 `statement_movement`) and the web showed a generic error.

## Decision
- The statement screen has an "Edit dates" action that opens an inline form with two date inputs, validates locally (closing inside the statement month, due date after closing), calls the endpoint and reloads the statement, telling the user that the installments of that period were reassigned.
- `Movement` gains a nullable `statement` field (`id`, `accountId`, `periodMonth`), filled by the movements repository from `movement.statement_id`. It is null for every movement that is not a statement charge or payment.
- The movements list links a statement-bound movement directly to its statement (a charge to its edit screen, a payment to the statement). Opening the movement form for such a movement shows an explanation with a "Go to statement" action instead of the form. The 409 `statement_movement` code is also mapped to a translated message.

## Alternatives considered
- Add the statement to the 409 body only: the user would still open a form that cannot be saved, and the list could not route directly. Rejected.
- Fetch statements from the web to find the owner of a movement: several requests and no single source of truth. Rejected.

## Consequences
- The movement response grows by one small nullable object; the integration suite covers it.
- Data isolation is unchanged: the statement lookup filters by `user_id`.
