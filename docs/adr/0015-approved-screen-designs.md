# 0015. Approved screen designs

- Status: Accepted; its preview rule is superseded by [0035](0035-no-ui-previews.md)
- Date: 2026-11-23
- Amends: [0014](0014-ui-preview-approval.md)

## Context
The owner reviewed the navigation map and mockups of the key screens in [design/mockups/screens.html](../../design/mockups/screens.html) and approved them as the design for the whole app.

## Decision
- Screens shown in the approved mockups are **pre-approved**. A pull request that implements them faithfully, following [DESIGN.md](../../DESIGN.md), keeps the automatic merge.
- The preview approval from [0014](0014-ui-preview-approval.md) is required only for:
  - Screens or flows that are not in the approved mockups.
  - Changes that depart from the approved mockups in structure, navigation or behavior.
- Approved screens: sign in, home, balance detail, new movement (expense, income, transfer and currency exchange), movements with search and filters, accounts, card statement, pay statement, to pay, reports, and the menu.

## Why
The owner already validated how every main screen looks and behaves. Reviewing each implementation again would slow delivery without adding information.

## Consequences
- Reviewers check UI pull requests against the approved mockups; a deviation found in review blocks the automatic merge and triggers a preview.
- Screens derived from approved ones (for example, editing a movement, using the same form as the new movement screen) follow the approved design and do not need a preview.
