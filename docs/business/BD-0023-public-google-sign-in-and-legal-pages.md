# BD-0023. Published Google sign-in and public legal pages

- Status: Accepted
- Date: 2026-11-23

## Context
[BD-0001](BD-0001-personal-non-commercial-use.md) and [BD-0003](BD-0003-google-sign-in.md) assumed a small circle of users: the owner, family and friends. While the Google OAuth consent screen is in "Testing" mode, only users added by hand can sign in. Publishing it is the only way for the people the owner invites to sign in without being added one by one, and Google requires a public home page and a public privacy policy link to publish.

## Decision
- The Google OAuth app is published. Anyone with a Google account can sign in and create their own account.
- The app has a public home page at `/` that describes miPlata, and public privacy policy and terms of use pages at `/privacy` and `/terms`, in Spanish and English, readable without signing in.
- The pages state only what is true today: what is collected, why, where it is stored, that nothing is sold, shared or advertised, that each user sees only their own data, how to request deletion, and that miPlata is a personal, non-commercial project.
- A contact email is shown publicly so people can ask questions and request deletion.

## Why
The owner wants family and friends to sign in without being added manually, and Google will not publish the app without a home page and a privacy policy. Being honest about the data handled is also the right thing to do once strangers can sign up.

## Consequences
- This supersedes nothing. It widens who can sign up compared to [BD-0001](BD-0001-personal-non-commercial-use.md) and [BD-0003](BD-0003-google-sign-in.md): users are no longer limited to people close to the owner, although the project stays personal and non-commercial.
- [BD-0002](BD-0002-each-user-owns-their-data.md) and [ADR 0005](../adr/0005-per-user-data-isolation.md) matter more: strict per-user isolation protects people the owner does not know.
- [BD-0012](BD-0012-institution-logos.md) says to revisit the logos if the app is published. Open sign-up is a step in that direction, so the owner should revisit it; the legal pages state that logos are trademarks of their owners.
- Any new data the app collects, or any change in who receives it, requires updating the policy in the same pull request.
- The deletion process is manual by email until an in-app option exists.
