# BD-0024. Category names and editing rules

- Status: Accepted
- Date: 2026-11-23
- Refines: [BD-0009](BD-0009-movement-types-and-categories.md), [BD-0010](BD-0010-category-icons.md)

## Context
BD-0009 lets users manage their categories and groups and requires unique names, but leaves open what counts as the same name and how defaults behave once edited.

## Decision
- A name is the same ignoring upper and lower case and extra spaces: "Pets" and " pets " are one name.
- Names are between 1 and 40 characters.
- A default category or group shows its name in the user's language until the user renames it; after that it shows the name the user wrote, in every language.
- An expense category can be moved to another group. An income category never has a group.
- The user can also choose no icon; the badge then shows the first letter of the name.
- Deactivating asks for a confirmation that explains the effect. Deleting a category that has movements is refused with a message that suggests deactivating it.
- Users can create a group at any time, and an empty group can be deleted.

## Why
- Names that differ only by case or spacing would look identical in lists and pickers.
- Showing the translated default until a rename keeps the app in the user's language, while a rename is a deliberate choice that should stay as written.
- Explaining the effect before deactivating prevents the surprise of a category disappearing from the picker.

## Consequences
- A custom name may equal the translated name of an untouched default, because translation depends on the interface language.
