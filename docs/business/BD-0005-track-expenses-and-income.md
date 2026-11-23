# BD-0005. Track expenses and income

- Status: Accepted
- Date: 2026-11-23

## Context
Recording only expenses shows where money goes, but not whether a user spends more than they earn.

## Decision
The app records both expenses and income for each user.

## Why
Users need their balance, not only their spending, to understand their personal finances.

## Consequences
- The data model distinguishes expense and income movements.
- Summaries can show balance over time, not only totals spent.
