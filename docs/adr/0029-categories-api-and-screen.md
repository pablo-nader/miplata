# 0029. Categories API and screen

- Status: Accepted
- Date: 2026-11-23

## Context
[BD-0009](../business/BD-0009-movement-types-and-categories.md) and [BD-0010](../business/BD-0010-category-icons.md) define how users manage categories, groups and icons. [ADR 0012](0012-category-icons-with-lucide.md) fixes the icon source and [ADR 0025](0025-database-schema-implementation.md) the schema. This record fixes the API, the screen and the reusable picker.

## Decision
- **Endpoints**, all behind `authMiddleware` and scoped by the session user id:
  - `GET /api/categories` returns `{ expenseGroups: [{ ...group, categories }], income }`, ordered by `sort_order`, including deactivated categories.
  - `POST /api/categories`, `PATCH /api/categories/:id` (name, icon, color, group), `POST /api/categories/:id/deactivate`, `POST /api/categories/:id/reactivate`, `DELETE /api/categories/:id`.
  - `POST /api/category-groups`, `PATCH /api/category-groups/:id`, `DELETE /api/category-groups/:id`.
- **Errors** are `{ error }` bodies: `400 invalid_request`, `group_required`, `group_not_allowed` or `group_not_found`; `404 not_found` for ids that do not exist, are not the user's or are not UUIDs; `409 name_taken`, `409 category_in_use` and `409 group_not_empty`.
- **Default names.** A seeded item keeps `name_key` and a null `name`. Renaming stores `name` and clears `name_key`, so the interface shows `t(name_key)` until the user renames it. `categoryLabel` in the shared package does this on every client.
- **Name uniqueness** is checked per user and type for categories and per user for groups, ignoring case and surrounding or repeated spaces, before the insert. The partial unique indexes are case-sensitive, so they only stop exact duplicates under concurrent requests; two simultaneous requests that differ only by case could both succeed, which is accepted for a single-user data set. Only custom names are compared: a custom name may equal the translated name of an untouched default, because the translation depends on the interface language and the API does not know it.
- **Deleting** relies on the `RESTRICT` rules of ADR 0025: the delete is attempted and a foreign key violation becomes `category_in_use` (movements, recurring movements) or `group_not_empty`. This is atomic, so it holds under concurrent writes. Budgets are the exception: ADR 0025 cascades them, so deleting a category or an empty group also deletes its budgets, and the confirmation says so.
- **Icons and colors.** The API accepts only icon names from `CATEGORY_ICON_NAMES` in `@miplata/shared` (the 42 icons of the defaults plus 20 more for personal finances) or null, and colors 1 to 5. A web test keeps that list equal to the icons the web app can render, and another checks every icon and every seeded default has a translation in both languages. The web translation files now define the `defaults.*` keys that ADR 0025 asked for.
- **API structure.** A `categories` module with `domain` (catalog building and placement rules), `application` (use cases over a repository port that always takes `userId`), `infrastructure` (Drizzle) and `http`. The integration suite covers every endpoint, including a data-isolation case per endpoint.
- **Screen.** `/categories` is reached from the menu and built only from existing design system parts plus four small molecules (`CategoryPicker`, `IconPicker`, `ColorPicker`, `ConfirmPanel`). Creating and editing use their own routes (`/categories/new`, `/categories/:id`, `/categories/groups/new`, `/categories/groups/:id`) instead of dialogs. Deactivating and deleting ask for an inline confirmation that explains the effect.
- **Category picker for movements.** `CategoryPickerContainer` (`type`, `value`, `onChange`, optional `featuredIds`) renders the approved "Nuevo gasto" pattern: a row of four categories and an "All" button that expands to every active category grouped by group. The new-movement placeholder renders it until the movements stage replaces that screen.

## Alternatives considered
- Case-sensitive uniqueness only: simplest, but "Rent" and "rent" would coexist and confuse the lists.
- Comparing custom names with the translated defaults: needs the language on the server and would still miss the other language.
- Dialogs for editing: there is no dialog in the design system and dialogs are harder to use on a phone.

## Consequences
- The movements stage uses `GET /api/categories` (or `CategoryPickerContainer`) and must treat deactivated categories as unavailable for new movements but still show them on past ones.
- Adding an icon to the picker is a change to `CATEGORY_ICON_NAMES`, the web icon map and both translation files; the tests fail if one is missed.
