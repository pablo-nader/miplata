# 0014. UI preview approval before merge

- Status: Accepted
- Date: 2026-11-23
- Amends: the automatic merge in [0006](0006-agent-driven-delivery-workflow.md)

## Context
Merges to `main` are automatic once CI and the dual review pass (see [0006](0006-agent-driven-delivery-workflow.md)). Tests can prove that a screen works, but not that it looks and feels right to the owner.

## Decision
- Any pull request that adds or changes user interface **is not merged automatically**. The owner approves a preview first.
- The preview includes the pull request's Vercel preview URL and screenshots of each changed screen at phone and desktop widths, in light and dark themes, and in Spanish.
- The owner's approval in the conversation unlocks the merge. Requested changes go back through review and CI before a new preview.
- Pull requests without user interface changes keep the automatic merge.

## Alternatives considered
- Reviewing only mockups before coding: catches direction issues early, but not how the real screen behaves.
- Reviewing after merge: changes would already be in production.

## Consequences
- User interface work waits for the owner's availability before reaching production.
- Each UI pull request description states that it needs preview approval.
