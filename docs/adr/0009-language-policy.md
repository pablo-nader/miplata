# 0009. Language policy

- Status: Accepted
- Date: 2026-11-23

## Context
The owner works with agents in Spanish but wants the repository consistent and readable by any developer or tool.

## Decision
- All code and documentation are always in English: identifiers, UI copy, tests, commit messages, pull requests, ADRs and business decisions.
- Conversations between the owner and agents are always in Spanish.

## Alternatives considered
- Spanish documentation: rejected, mixing languages in the repository hurts consistency.

## Consequences
- Agents translate decisions agreed in Spanish into English when recording them.
- If the app needs a Spanish user interface, it is delivered through translations, not by writing source strings in Spanish.
