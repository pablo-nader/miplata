# BD-0028. Recurring movement lifecycle

- Status: Accepted
- Date: 2026-11-23
- Refines: [BD-0016](BD-0016-recurring-movements.md)

## Context
BD-0016 says that changes apply only to future occurrences and that the user can pause and end recurring movements, but it leaves open what happens to dates that already passed, to pending items when pausing, and how far ahead the list looks.

## Decision
- **Look-ahead.** "To pay" and "To collect" list pending items that are overdue, due today, or due within the next 30 days.
- **Past dates.** A recurring movement defined with a start date in the past shows each past date as overdue, so a bill the user forgot to enter can still be confirmed or skipped.
- **Editing.** Saving a change applies the new day and frequency only to the dates after today. Items still pending, including overdue ones, show the new amount, account and category because nothing was recorded for them yet; movements already recorded never change. Dates the new schedule would have placed in the past are not created.
- **Pausing.** Pausing removes the pending items that are not yet due and stops new ones. Items already overdue or due today stay in the list. Resuming does not recreate the dates missed while paused.
- **Ending.** Ending sets a last date, today by default, and the recurring movement counts as ended from that date. Pending items after it disappear. An ended recurring movement cannot be resumed; the user creates a new one.
- **Skipping.** A skipped date is never shown again.
- **Confirming.** The recorded movement is dated the due date unless the user changes it, and it counts in balances and totals only from then on. A movement that confirmed a recurring date cannot be deleted for now.

## Why
- Keeping history stable matches the rule that recorded movements never change.
- Not backfilling after a pause or an edit avoids a flood of overdue items the user did not ask for.

## Alternatives considered
- Backfilling after resume: shows every missed month as overdue, which is noise for a pause the user chose.
- Letting the user delete confirmed movements and reopen the date: useful, but needs a clear rule for what happens to the date; left for later.

## Consequences
- Reports and budgets count only confirmed occurrences.
- Reverting a confirmed occurrence needs its own decision.
