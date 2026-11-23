# 0041. Most used categories endpoint

- Status: Accepted
- Date: 2026-11-23
- Refines: [0037](0037-budgets-api-and-screen.md)

## Context
[BD-0029](../business/BD-0029-category-picker-and-creating-people.md) shows each user's most used categories in the category picker. The ranking must come from the user's own movements.

## Decision
- `GET /api/categories/most-used?type=expense|income` returns `{ categoryIds }`, at most four, for the session user. The user id comes only from the session.
- The window is the 90 days that end today, both days included, in Argentina time. Movements dated after today are not counted.
- Only active categories of the requested type count. They are ranked by number of movements, then by group order, then by category order, then by id, so the result is deterministic.
- A new `mostUsedCategoryIds` method on the category repository port runs one grouped query over `movement` joined to `category` on `user_id` and `id`, with a left join to the group for the tie-break.
- The client fills the remaining slots with the default order, so the endpoint never invents categories.
- `addDays` moves to `@miplata/shared` so the application layer and the recurring domain share one date helper.

## Alternatives considered
- Counting on the client from the movements list: sends every movement to the browser. Rejected.
- Storing a usage counter on the category: adds a write on every movement and a way to drift. Rejected.

## Consequences
- One extra small request when a category picker opens, whose failure only means the default order.
