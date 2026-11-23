# BD-0029. Category picker and where people are created

- Status: Accepted
- Date: 2026-11-23
- Refines: [BD-0009](BD-0009-movement-types-and-categories.md), [BD-0010](BD-0010-category-icons.md), [BD-0017](BD-0017-loans-and-purchases-for-others.md)

## Context
The owner tried the movement form and hit two problems. The "All" option of the category picker opened a very large grid that needed a lot of scrolling. And people could only be created from Accounts, so there was no way to create one while marking an expense as belonging to someone else.

## Decision

### Choosing a category
- Wherever a category is picked, the picker shows the user's **4 most used categories** for the type of movement, plus a **search button** with a magnifying glass.
- "Most used" counts the movements recorded in the last 90 days, only for active categories of that type. A user with fewer than 4 used categories sees the rest in the default order, so new users still get 4.
- The search button opens a selector with a search field that is focused as soon as it opens. It filters by category name and by group name, ignoring case and accents, in the language of the app. Results are grouped by group and the selected category is marked.
- The selector works fully with the keyboard and ends with a shortcut to add a category.
- The selected category always stays visible in the picker, even if it is not among the most used.

### Creating people
- When "Belongs to another person" is on, the person picker offers **New person**. It asks only for a name, creates the person without leaving the form and selects it. A person created this way can hold pesos and dollars.
- In Accounts, the People section has its own **Add person** action and, while empty, a note that explains what people are for: lending, borrowing and purchases for others.
- People remain accounts of type person, created with the same rules as any account (see [BD-0017](BD-0017-loans-and-purchases-for-others.md)). Opening balances and currencies can still be edited from Accounts.

## Why
- A short list of what the user really uses is faster than a long grid, and search covers the rest without scrolling.
- Creating a person at the moment it is needed removes the detour that made the feature hard to discover.
- The explanation and the visible action in Accounts make the same feature easy to find from the other direction.

## Consequences
- The add-category shortcut leaves the form to the category editor, so data typed in the form is not kept.
