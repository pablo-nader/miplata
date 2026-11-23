# 0034. Recurring movements API

- Status: Accepted
- Date: 2026-11-23
- Related: [0005](0005-per-user-data-isolation.md), [0016](0016-data-model.md), [0017](0017-project-structure.md), [0031](0031-movements-api.md), [BD-0016](../business/BD-0016-recurring-movements.md), [BD-0028](../business/BD-0028-recurring-movement-lifecycle.md)

## Context
BD-0016 asks for recurring movements that stay pending until the user confirms them. The schema already has `recurring` and `recurring_occurrence` with a unique `(recurring_id, due_on)` ([0016](0016-data-model.md)), and the pure schedule lives in `apps/api/src/recurring/domain/schedule.ts`. The app is serverless on Vercel ([0001](0001-hosting-on-vercel.md)), so there is no scheduler to create occurrences.

## Decision
- **Module.** `apps/api/src/recurring/` with the hexagonal layers. Routes mount under `/api/recurring`, all behind `authMiddleware`; the user id comes only from the session and every repository method takes `userId`.
- **Endpoints.** `GET|POST /recurring`, `GET|PUT /recurring/:id`, `POST /recurring/:id/pause|resume|end`, `GET /recurring/occurrences?type=`, `POST /recurring/occurrences/:id/confirm|skip`. Unknown, malformed or foreign ids answer `404`; a foreign account or category in a body answers `400` with `account_not_found` or `category_not_found`, as in [0031](0031-movements-api.md). Confirming or skipping an occurrence that is no longer pending answers `409 occurrence_resolved`; resuming an ended recurring movement answers `409 recurring_ended`.
- **Occurrences are generated when read, idempotently.** Listing occurrences runs a generation pass for the active recurring movements of the user up to today plus `UPCOMING_DAYS` (30). Rows are written with `insert ... on conflict do nothing` on `(recurring_id, due_on)`, so concurrent reads never duplicate. The generator resumes after the latest existing occurrence of each recurring movement, whatever its status, so skipped and confirmed dates are never recreated.
- **The template is read live.** A pending occurrence stores only its date and status; description, category, account, currency and amount come from the recurring row when listed. A recorded movement is a real movement and never changes.
- **Edits, pauses and ends affect only the future.** Before each of them the generator first materializes the dates due up to today under the old rule. Then the pending occurrences dated after today (after the end date for an end) are deleted and the new rule applies. On edit and resume the dates the new rule would have placed between the last existing occurrence and today are inserted as `skipped`, so a changed or resumed schedule never backfills history. Pause stops generation; resume re-enables it.
- **Today.** "Today" comes from the `today` clock the application already receives (`todayInArgentina`, the Argentina calendar date), so tests control it. The occurrence listing returns `today` so the client compares against the date of the server.
- **Confirm.** The application builds an ordinary `EntryRequest` from the template, with optional overrides of amount, account and date, and calls the movements module with the occurrence id. `createForOccurrence` in the movement repository runs one transaction that locks the pending occurrence row (`for update`), inserts the movement with `recurring_occurrence_id`, and marks the occurrence `confirmed` with its `movement_id`. Two simultaneous confirmations therefore create one movement. A credit card expense takes the normal card path, so it becomes a card purchase on the right statement ([0031](0031-movements-api.md)). A variable amount must be sent on confirm; the suggestion is the amount of the last confirmed movement of that recurring movement.
- **Validation on define.** Creating or editing dry-runs the same planning used for a real movement, so account, currency, category type and card rules are checked once. An edit may keep an account or category that was deactivated since.
- **Yearly rules.** `month_of_year` is derived from the start date, so the request does not carry it.
- **Pending is not recorded.** Occurrences have no postings or installments, so balances and month totals ignore them by construction.
- **Tests.** Unit tests for the generation domain and for routes with in-memory repositories, and integration tests against Postgres for every endpoint with a data-isolation case each.

## Alternatives considered
- **A scheduled job creating occurrences.** Needs a cron on Vercel and still must handle missed runs; generating on read is stateless and idempotent.
- **A watermark column on `recurring`.** Would make generation exact without sentinel rows, but needs a migration; skipped sentinel rows reuse the existing schema.
- **Snapshotting the template into each occurrence.** Lets old occurrences keep old amounts, but BD-0016 says changes apply to future occurrences, which live reads give for free.

## Consequences
- A recurring movement defined with a start date in the past produces its past occurrences as overdue the first time they are read.
- A movement that confirmed an occurrence cannot be deleted (`409 movement_in_use`) until a later stage offers a way to revert an occurrence.
- Edit, pause and resume run as separate steps, so a read of the occurrences between them from the same user can create an occurrence with the old rule; the effect is limited to that user and shows as an extra pending item that can be skipped.
- Resuming a recurring movement that is not paused changes nothing.
- A recurring movement cannot be deleted in this stage, only paused or ended.
- Reports and budgets must ignore pending occurrences; only confirmed ones are movements.
