# BD-0012. Institution logos

- Status: Accepted
- Date: 2026-11-23

## Context
Accounts for banks and virtual wallets must be easy to identify at a glance (see [BD-0011](BD-0011-accounts-and-transfers.md)). Using institution logos raises trademark concerns.

## Decision
Accounts show the logo of their bank or virtual wallet when one is available. Accounts without a logo (cash, custom names, or institutions without one) show the icon of their account type and their name.

## Why
The app is private and non-commercial, used by the owner's family and friends (see [BD-0001](BD-0001-personal-non-commercial-use.md)). Logos are the fastest way to recognize an account, and payment apps commonly show them the same way. The owner accepted the trademark risk for this private use.

## Consequences
- Logos are trademarks of their owners and are used only to identify the institution, never as the app's own branding.
- Logo files are added to the repository only with the owner's approval of each source.
- If the app is ever published or used commercially, this record must be revisited.
