# BD-0009. Movement types and categories

- Status: Accepted; movement types amended by [BD-0011](BD-0011-accounts-and-transfers.md), which adds transfers
- Date: 2026-11-23

## Context
Users record money coming in and going out (see [BD-0005](BD-0005-track-expenses-and-income.md)). Each movement needs a category so users can see where their money goes.

## Decision

### Movement types
There are two movement types: **income** and **expense**.

### Structure
- **Expense categories are grouped**: every expense category belongs to one group. A movement is always recorded in a category, never in a group. Groups exist to summarize (for example, how much goes to taxes).
- **Income categories have one level**, with no groups.

### Default categories
Every new user starts with this list.

| Expense group | Categories |
| --- | --- |
| Housing | Building fees (expensas), Rent, Maintenance, Home insurance |
| Utilities | Electricity, Gas, Water, Internet, Mobile phone, Subscriptions |
| Taxes | Property tax (inmobiliario), Municipal tax, Vehicle tax (patente) |
| Food | Groceries, Delivery and restaurants |
| Transport | Fuel, Car insurance, Tolls and parking, Car maintenance, Public transport |
| Health | Health insurance (prepaga or obra social), Pharmacy, Medical visits |
| Personal | Going out, Clothing, Gym, Education, Gifts, Pets, Travel |
| Other | Other |

Income categories: Salary, Bonus (aguinaldo), Fees or freelance, Rental income, Investment returns, Refunds, Other.

### Managing categories and groups
- Categories and groups belong to each user. Changing them never affects another user (see [BD-0002](BD-0002-each-user-owns-their-data.md)).
- Users can create, rename, edit and delete categories and groups freely, including the default ones.
- **A category that has movements cannot be deleted; it can only be deactivated.** A deactivated category is not offered when recording a new movement, but past movements and reports keep showing it. It can be reactivated.
- **A group that contains categories cannot be deleted.** It can be deleted once it is empty.

### Credit cards
Credit cards (Visa, Mastercard, American Express) are **not** categories. Recording them as categories counts the same money twice: once for each purchase and again when the card statement is paid. They are modeled as payment methods, decided in a separate record. Paying a card statement must still be recordable without counting as a new expense.

## Why
- Two levels give useful summaries without slowing down recording, since the user picks only the category.
- A starting list makes the app useful from the first minute, while full editing lets each user adapt it.
- Blocking deletion of used categories keeps history and reports intact.

## Consequences
- Each user gets their own copy of the default groups and categories when their account is created.
- Category and group names must be unique per user and type.
- Default category names are shown to users in Spanish; how the UI language is handled is decided separately.
