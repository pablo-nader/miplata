# 0036. Committed report includes recurring movements

- Status: Accepted
- Date: 2026-11-23
- Supersedes: the committed and recurring parts of [0032](0032-reports-api.md)
- Related: [0034](0034-recurring-movements-api.md), [BD-0016](../business/BD-0016-recurring-movements.md), [BD-0018](../business/BD-0018-initial-reports.md)

## Context
[0032](0032-reports-api.md) left `recurringMinor` at zero until the recurring module existed. Occurrences are generated lazily up to a short horizon ([0034](0034-recurring-movements-api.md)), so reading stored pending occurrences would miss every month beyond it.

## Decision
- **Source.** The committed report computes recurring amounts from the active templates with the schedule rules of the recurring module, for every due date inside the requested months, instead of reading stored occurrences.
- **What counts.** Expense templates that are not paused, in the requested currency, between their start and end dates, optionally filtered by account and category. A due date whose occurrence is already confirmed (it is a real movement and counts through its installment) or skipped does not count.
- **Amount.** A fixed template counts its amount; a variable one counts the last confirmed amount, falling back to its template amount, and nothing when neither exists.
- **Port.** `RecurringRepository.committedSchedule` returns the matching templates with their estimates and the resolved dates; `recurringCommitmentsFrom` in the reports module turns them into amounts per month, and `createApp` wires it by default.
- **Isolation.** Both queries filter by `user_id`.

## Consequences
- Income recurring movements are never part of the committed report.
- A due date in the past that is still pending counts in its own month only if that month is inside the requested window.
